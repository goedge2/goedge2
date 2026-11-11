import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Select, Space, Spin, Tag, Typography, message } from "antd";

import type { MessageRecipient } from "@/pb/models/model_message_recipient_pb";
import type { MessageRecipientGroup } from "@/pb/models/model_message_recipient_group_pb";
import { clusterQueryKeys, messageQueryKeys } from "@/queries/keys";
import { listMessageRecipientGroups, listMessageRecipients } from "@/services/messageRecipients";
import { listClusterMessageReceivers, updateClusterMessageReceivers, type MessageReceiverRecord } from "@/services/clusterSettings";
import { formatErrorMessage } from "@/utils";

import { buildClusterMessageReceiverPayload } from "../settingsHelpers";

type ClusterMessageSettingsPanelProps = {
  clusterId: string;
};

function stringifyId(value?: bigint | number | string | null) {
  return value == null ? "" : String(value);
}

function buildRecipientLabel(recipient?: MessageRecipient) {
  if (!recipient) {
    return "";
  }

  const adminName = recipient.admin?.fullname?.trim() || recipient.admin?.username?.trim() || `管理员 ${recipient.admin?.id ?? ""}`;
  const mediaName = recipient.messageMediaInstance?.name?.trim();
  const user = recipient.user?.trim();

  return [adminName, mediaName, user].filter(Boolean).join(" / ");
}

function buildGroupLabel(group?: MessageRecipientGroup) {
  return group?.name?.trim() || "";
}

export function ClusterMessageSettingsPanel({ clusterId }: ClusterMessageSettingsPanelProps) {
  const [editedSelection, setEditedSelection] = useState<{ dataKey: string; recipientIds: string[]; groupIds: string[] }>();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const receiversQuery = useQuery({
    queryKey: clusterQueryKeys.messageReceivers(clusterId),
    queryFn: () => listClusterMessageReceivers(clusterId),
  });
  const recipientsQuery = useQuery({
    queryKey: messageQueryKeys.recipients({ page: 1, size: 200, keyword: "" }),
    queryFn: () => listMessageRecipients(new URLSearchParams({ page: "1", size: "200", keyword: "" })),
  });
  const groupsQuery = useQuery({
    queryKey: messageQueryKeys.recipientGroups(),
    queryFn: listMessageRecipientGroups,
  });

  const receiverSelection = useMemo(() => {
    const nextRecipientIds = new Set<string>();
    const nextGroupIds = new Set<string>();
    const messageReceivers = receiversQuery.data?.messageReceivers ?? [];

    for (const receiver of messageReceivers) {
      if (receiver.messageRecipient?.id) {
        nextRecipientIds.add(stringifyId(receiver.messageRecipient.id));
      }
      if (receiver.messageRecipientGroup?.id) {
        nextGroupIds.add(stringifyId(receiver.messageRecipientGroup.id));
      }
    }

    return {
      dataKey: messageReceivers
        .map((receiver) => `${stringifyId(receiver.messageRecipient?.id)}:${stringifyId(receiver.messageRecipientGroup?.id)}`)
        .join("|"),
      recipientIds: Array.from(nextRecipientIds),
      groupIds: Array.from(nextGroupIds),
    };
  }, [receiversQuery.data]);
  const selectedRecipientIds = editedSelection?.dataKey === receiverSelection.dataKey ? editedSelection.recipientIds : receiverSelection.recipientIds;
  const selectedGroupIds = editedSelection?.dataKey === receiverSelection.dataKey ? editedSelection.groupIds : receiverSelection.groupIds;

  const recipientOptions = (recipientsQuery.data?.messageRecipients ?? []).map((recipient) => ({
    label: buildRecipientLabel(recipient) || `接收人 ${recipient.id}`,
    value: stringifyId(recipient.id),
  }));
  const groupOptions = (groupsQuery.data?.messageRecipientGroups ?? []).map((group) => ({
    label: buildGroupLabel(group) || `分组 ${group.id}`,
    value: stringifyId(group.id),
  }));

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const payload = buildClusterMessageReceiverPayload(clusterId, [
        ...selectedRecipientIds.map((id) => ({ type: "recipient" as const, id })),
        ...selectedGroupIds.map((id) => ({ type: "group" as const, id })),
      ]);
      await updateClusterMessageReceivers(payload);
      message.success("消息通知已保存");
      await queryClient.invalidateQueries({ queryKey: clusterQueryKeys.messageReceivers(clusterId) });
    } catch (error) {
      message.error(formatErrorMessage("保存消息通知失败", error));
    } finally {
      setSubmitting(false);
    }
  };

  const currentReceivers = (receiversQuery.data?.messageReceivers ?? []) as MessageReceiverRecord[];

  return (
    <Card
      title="消息通知"
      extra={
        <Button type="primary" onClick={handleSave} loading={submitting}>
          保存
        </Button>
      }
    >
      {receiversQuery.isPending || recipientsQuery.isPending || groupsQuery.isPending ? (
        <Spin />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <div>
            <Typography.Title level={5}>接收人</Typography.Title>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              placeholder="选择消息接收人"
              value={selectedRecipientIds}
              options={recipientOptions}
              onChange={(values) => setEditedSelection({ dataKey: receiverSelection.dataKey, recipientIds: values, groupIds: selectedGroupIds })}
            />
          </div>

          <div>
            <Typography.Title level={5}>接收人分组</Typography.Title>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              placeholder="选择接收人分组"
              value={selectedGroupIds}
              options={groupOptions}
              onChange={(values) => setEditedSelection({ dataKey: receiverSelection.dataKey, recipientIds: selectedRecipientIds, groupIds: values })}
            />
          </div>

          <div>
            <Typography.Title level={5}>当前关联</Typography.Title>
            {currentReceivers.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂时还没有关联接收人" />
            ) : (
              <Space wrap>
                {currentReceivers.map((receiver) => {
                  const key = stringifyId(receiver.id);
                  const label = buildRecipientLabel(receiver.messageRecipient) || buildGroupLabel(receiver.messageRecipientGroup) || key;
                  return <Tag key={key}>{label}</Tag>;
                })}
              </Space>
            )}
          </div>
        </Space>
      )}
    </Card>
  );
}
