import { App as AntApp, Button, Form, Input, Modal, Switch, Typography } from "antd";
import { request } from "@umijs/max";
import { useCallback, useEffect, useMemo, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { formatErrorMessage, getErrorMessage } from "@/utils";

type AdminProfile = {
  id: number;
  fullname: string;
  username: string;
  otpOn: boolean;
  otpBound: boolean;
};

type ProfileFormValues = {
  fullname: string;
  currentPassword?: string;
  password?: string;
  confirmPassword?: string;
  otpOn: boolean;
};

type ProfileProps = {
  open: boolean;
  onClose: () => void;
  onDisplayNameChange?: (displayName: string) => void;
};

const formatProfile = (data: unknown): AdminProfile | null => {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const responseLike = data as {
    admin?: unknown;
    otpOn?: unknown;
    otpBound?: unknown;
  };

  if (typeof responseLike.admin !== "object" || responseLike.admin === null) {
    return null;
  }

  const profileLike = responseLike.admin as {
    id?: unknown;
    fullname?: unknown;
    username?: unknown;
  };

  return {
    id: Number(profileLike.id ?? 0),
    fullname: typeof profileLike.fullname === "string" ? profileLike.fullname : "",
    username: typeof profileLike.username === "string" ? profileLike.username : "",
    otpOn: !!responseLike.otpOn,
    otpBound: !!responseLike.otpBound,
  };
};

const getProfileDisplayName = (profile: AdminProfile | null): string => {
  const fullname = profile?.fullname?.trim();
  if (fullname) {
    return fullname;
  }

  const username = profile?.username?.trim();
  if (username) {
    return username;
  }

  return "Profile";
};

const getOTPSuccessMessage = (profile: AdminProfile | null, values: ProfileFormValues, resetOTP: boolean): string => {
  if (resetOTP) {
    return "OTP 已重置，请在下次登录时重新绑定";
  }

  if (profile && profile.otpOn && !values.otpOn) {
    return "OTP 已关闭";
  }

  if (profile && !profile.otpOn && values.otpOn) {
    return "OTP 已开启，请在下次登录时完成绑定";
  }

  return "个人资料已更新";
};

function Profile(props: ProfileProps) {
  const { open, onClose, onDisplayNameChange } = props;
  const { message, modal } = AntApp.useApp();

  const [form] = Form.useForm<ProfileFormValues>();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOTPRequested, setResetOTPRequested] = useState(false);

  const profileDisplayName = useMemo(() => getProfileDisplayName(profile), [profile]);
  const passwordValue = Form.useWatch("password", form);
  const otpOnValue = Form.useWatch("otpOn", form);
  const currentOTPOff = otpOnValue ?? profile?.otpOn ?? false;
  const willDisableOTP = !!profile?.otpOn && !currentOTPOff;
  const requiresCurrentPassword = Boolean(passwordValue) || willDisableOTP || resetOTPRequested;
  const otpStatusText = !currentOTPOff ? "未开启" : resetOTPRequested || !profile?.otpBound ? "已开启，未绑定" : "已开启，已绑定";

  const setProfileFormValues = useCallback(
    (nextProfile: AdminProfile | null) => {
      form.setFieldsValue({
        fullname: nextProfile?.fullname ?? "",
        currentPassword: "",
        password: "",
        confirmPassword: "",
        otpOn: nextProfile?.otpOn ?? false,
      });
    },
    [form],
  );

  const fetchProfile = useCallback(async () => {
    try {
      const response = await request("/api/admin/profile");
      const nextProfile = formatProfile(response);
      setProfile(nextProfile);
      if (open) {
        setProfileFormValues(nextProfile);
      }
    } catch (error) {
      console.error("加载个人资料失败:", error);
      message.error(formatErrorMessage("加载个人资料失败", error));
      setProfile(null);
    }
  }, [message, open, setProfileFormValues]);

  const resetFormState = useCallback(() => {
    setResetOTPRequested(false);
    form.resetFields();
  }, [form]);

  const handleCancel = useCallback(() => {
    resetFormState();
    onClose();
  }, [onClose, resetFormState]);

  const handleSubmit = useCallback(
    async (values: ProfileFormValues) => {
      try {
        setSaving(true);
        await request("/api/admin/profile", {
          method: "PUT",
          data: {
            fullname: values.fullname || "",
            currentPassword: values.currentPassword || "",
            password: values.password || "",
            otpOn: !!values.otpOn,
            resetOTP: resetOTPRequested,
          },
        });

        message.success(getOTPSuccessMessage(profile, values, resetOTPRequested));
        await fetchProfile();
        setResetOTPRequested(false);
        handleCancel();
      } catch (error) {
        modal.error({
          title: "更新个人资料失败",
          content: getErrorMessage(error, "请求出错，请稍后重试"),
        });
      } finally {
        setSaving(false);
      }
    },
    [fetchProfile, handleCancel, message, modal, profile, resetOTPRequested],
  );

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      try {
        const response = await request("/api/admin/profile");
        if (ignore) {
          return;
        }
        const nextProfile = formatProfile(response);
        setProfile(nextProfile);
        if (open) {
          setProfileFormValues(nextProfile);
        }
      } catch (error) {
        if (ignore) {
          return;
        }
        console.error("加载个人资料失败:", error);
        message.error(formatErrorMessage("加载个人资料失败", error));
        setProfile(null);
      }
    };

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [message, open, setProfileFormValues]);

  useEffect(() => {
    if (profile === null) {
      return;
    }

    onDisplayNameChange?.(profileDisplayName);
  }, [onDisplayNameChange, profile, profileDisplayName]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Revalidate when password and OTP requirements change.
  useEffect(() => {
    void form.validateFields(["currentPassword"]);
  }, [form, requiresCurrentPassword, resetOTPRequested]);

  return (
    <Modal
      open={open}
      title="个人资料"
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (visible) {
          setResetOTPRequested(false);
          setProfileFormValues(profile);
        }
      }}
    >
      <Form<ProfileFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="用户名">
          <Input value={profile?.username ?? ""} disabled />
        </Form.Item>
        <Form.Item name="fullname" label="姓名">
          <Input tabIndex={0} placeholder="请输入姓名，留空则显示用户名" />
        </Form.Item>
        <Form.Item
          name="currentPassword"
          label="当前密码"
          dependencies={["password", "otpOn"]}
          hasFeedback
          rules={[
            () => ({
              validator(_, value) {
                if (!requiresCurrentPassword && !value) {
                  return Promise.resolve();
                }
                if (typeof value === "string" && value.length > 0) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("涉及密码、关闭 OTP 或重置 OTP 时必须输入当前密码"));
              },
            }),
          ]}
        >
          <PasswordInput tabIndex={0} placeholder="修改密码、关闭 OTP 或重置 OTP 时必填" />
        </Form.Item>
        <Form.Item
          name="password"
          label="新密码"
          hasFeedback
          rules={[
            () => ({
              validator(_, value) {
                if (!value) {
                  return Promise.resolve();
                }
                if (typeof value !== "string" || value.length === 0) {
                  return Promise.reject(new Error("请输入新密码"));
                }
                if (value.length < 8) {
                  return Promise.reject(new Error("密码长度至少8位"));
                }
                if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
                  return Promise.reject(new Error("密码需包含字母和数字"));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <PasswordInput tabIndex={0} placeholder="不修改密码可留空" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={["password"]}
          hasFeedback
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const password = getFieldValue("password");
                if (!password && !value) {
                  return Promise.resolve();
                }
                if (value === password) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <PasswordInput tabIndex={0} placeholder="请再次输入新密码" />
        </Form.Item>
        <Form.Item label="OTP">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <Typography.Text type={currentOTPOff ? "success" : "secondary"}>状态：{otpStatusText}</Typography.Text>
            <Form.Item name="otpOn" valuePropName="checked" noStyle>
              <Switch
                tabIndex={0}
                checkedChildren="开启"
                unCheckedChildren="关闭"
                onChange={(checked) => {
                  if (!checked) {
                    setResetOTPRequested(false);
                  }
                }}
              />
            </Form.Item>
          </div>
        </Form.Item>
        {currentOTPOff && profile?.otpBound && (
          <Form.Item label="OTP 操作">
            <Button
              danger={!resetOTPRequested}
              type={resetOTPRequested ? "default" : "primary"}
              onClick={() => {
                setResetOTPRequested((current) => !current);
              }}
            >
              {resetOTPRequested ? "取消重置 OTP" : "重置 OTP"}
            </Button>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              {resetOTPRequested ? "已标记重置，保存后下次登录需要重新绑定。" : "重置后会清空当前绑定，保存后下次登录需要重新绑定。"}
            </Typography.Text>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

export default Profile;
