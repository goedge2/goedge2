import { useQuery } from "@tanstack/react-query";
import { Select, type SelectProps } from "antd";
import type { FindAllEnabledServerGroupsResponse } from "@/pb/service_server_group_pb";
import { serverQueryKeys } from "@/queries/keys";
import { listServerGroups } from "@/services/servers";

type ServerGroupSelectorProps = Pick<SelectProps, "value" | "onChange" | "mode" | "placeholder"> & {
  userId?: string;
  includeUngrouped?: boolean;
};

export function ServerGroupSelector({ userId = "0", includeUngrouped = false, ...props }: ServerGroupSelectorProps) {
  const params = new URLSearchParams({ userId });
  const query = useQuery<FindAllEnabledServerGroupsResponse>({
    queryKey: userId === "0" ? serverQueryKeys.groupsBase() : serverQueryKeys.groups(params),
    queryFn: () => listServerGroups(params),
  });
  const options = (query.data?.serverGroups ?? []).map((group) => ({ label: group.name, value: String(group.id) }));
  if (includeUngrouped) {
    options.unshift({ label: "未分组", value: "-1" });
  }

  return (
    <Select
      allowClear
      showSearch={{ optionFilterProp: "label" }}
      placeholder="选择网站分组"
      loading={query.isFetching}
      status={query.isError ? "error" : undefined}
      notFoundContent={query.isError ? "加载网站分组失败，请重新打开重试" : undefined}
      onOpenChange={(open) => {
        if (open && query.isError) void query.refetch();
      }}
      options={options}
      {...props}
    />
  );
}
