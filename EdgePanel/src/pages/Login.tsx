import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { LoginForm, ProFormCheckbox, ProFormText } from "@ant-design/pro-components";
import { App as AntApp, Button, Card, ConfigProvider, Flex, Input, Spin, theme, Typography } from "antd";
import { md5 } from "js-md5";
import { lazy, Suspense, useRef, useState } from "react";
import { request, useNavigate } from "@umijs/max";
import loginGlow from "@/assets/layout-bg-1.webp";
import loginNetwork from "@/assets/login-network.svg";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import { shouldAutoVerifyOTP } from "@/runtime/otp";
import { storeAccessToken } from "@/runtime/auth";
import { useShellUIConfigQuery } from "@/runtime/shellQueries";
import useThemeStore from "@/stores/themeStore";
import { formatErrorMessage, getErrorMessage } from "@/utils";
import "@/components/TechBackground.css";
import "./Login.css";

const OtpQRCode = lazy(() => import("@/components/OtpQRCode"));

type FieldType = {
  username: string;
  password: string;
  rememberMe?: boolean;
};

type LoginResponse = {
  adminId: number;
  isOk: boolean;
  token: string;
  message?: string;
  requireOTP?: boolean;
  otpAuthUrl?: string;
  otpSecret?: string;
};

type LoginStep = "password" | "bind" | "verify";

function Login() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <LoginContent isDarkMode={isDarkMode} />
    </ConfigProvider>
  );
}

function LoginContent({ isDarkMode }: { isDarkMode: boolean }) {
  const { modal, message } = AntApp.useApp();
  const navigate = useNavigate();
  const { data: uiConfigData } = useShellUIConfigQuery();
  const uiConfig = uiConfigData?.ui;
  const { token } = theme.useToken();

  const [step, setStep] = useState<LoginStep>("password");
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [otpSecret, setOtpSecret] = useState("");
  const [savedCredentials, setSavedCredentials] = useState<{ username: string; password: string; rememberMe: boolean } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [enteringApp, setEnteringApp] = useState(false);
  const otpSubmittingRef = useRef(false);

  const showEnteringApp = enteringApp;

  const startConsoleNavigation = () => {
    setEnteringApp(true);
    navigate("/", { replace: true });
  };

  const onLogin = async (values: FieldType) => {
    try {
      const payload = {
        ...values,
        password: md5(values.password),
      };
      const data = await request<LoginResponse>("/api/admin/login", {
        method: "POST",
        data: payload,
        skipErrorHandler: true,
      });

      if (data.isOk) {
        storeAccessToken(data.token, Boolean(values.rememberMe));
        startConsoleNavigation();
      } else if (data.requireOTP && data.otpAuthUrl) {
        setSavedCredentials({ username: payload.username, password: payload.password, rememberMe: Boolean(values.rememberMe) });
        setOtpAuthUrl(data.otpAuthUrl);
        setOtpSecret(data.otpSecret || "");
        setStep("bind");
      } else if (data.requireOTP && !data.otpAuthUrl) {
        setSavedCredentials({ username: payload.username, password: payload.password, rememberMe: Boolean(values.rememberMe) });
        setStep("verify");
      } else {
        modal.error({
          title: "登录失败",
          content: data.message || "未知错误",
        });
      }
    } catch (error) {
      modal.error({ title: "登录失败", content: getErrorMessage(error, "请求出错，请稍后重试") });
      console.log("login error: ", error);
    }
  };

  const handleOTPVerify = async (isBind: boolean, verificationCode = otpCode) => {
    if (!savedCredentials || otpSubmittingRef.current) return;
    otpSubmittingRef.current = true;
    setOtpLoading(true);
    try {
      const payload = {
        username: savedCredentials.username,
        password: savedCredentials.password,
        otpSecret: "",
        otpCode: verificationCode,
      };
      if (isBind) {
        payload.otpSecret = otpSecret;
      }

      const data = await request<LoginResponse>("/api/admin/login", {
        method: "POST",
        data: payload,
        skipErrorHandler: true,
      });

      if (data.isOk) {
        storeAccessToken(data.token, savedCredentials.rememberMe);
        startConsoleNavigation();
      } else {
        message.error(data.message || "OTP验证失败");
      }
    } catch (error) {
      message.error(formatErrorMessage("OTP验证失败", error));
      console.log("otp verify error: ", error);
    } finally {
      otpSubmittingRef.current = false;
      setOtpLoading(false);
    }
  };

  const handleOTPCodeChange = (nextOtpCode: string) => {
    setOtpCode(nextOtpCode);

    if (shouldAutoVerifyOTP(nextOtpCode, otpSubmittingRef.current)) {
      void handleOTPVerify(step === "bind", nextOtpCode);
    }
  };

  return (
    <Flex
      className={`login-page tech-background-theme${isDarkMode ? " tech-background-theme-dark" : ""}`}
      data-theme={isDarkMode ? "dark" : "light"}
      justify="center"
      align="center"
      style={{ backgroundColor: token.colorBgLayout }}
    >
      <div className="tech-background" aria-hidden="true">
        <img src={loginGlow} alt="" />
        <img src={loginGlow} alt="" />
        <img src={loginNetwork} alt="" />
      </div>
      <div className="login-theme-selector">
        <ThemeModeSelector />
      </div>
      <Card
        className="login-card"
        style={{ background: `color-mix(in srgb, ${token.colorBgContainer} 94%, transparent)`, borderColor: token.colorBorderSecondary }}
      >
        {showEnteringApp && (
          <Flex vertical align="center" justify="center" gap={12} style={{ width: "100%", minHeight: 240, padding: "24px 0" }}>
            <Spin size="large" />
            <Typography.Title level={4} style={{ margin: 0 }}>
              登录成功
            </Typography.Title>
            <Typography.Text type="secondary">正在加载控制台，请稍候...</Typography.Text>
          </Flex>
        )}

        {!showEnteringApp && step === "password" && (
          <LoginForm<FieldType>
            title={uiConfig?.productName || "GoEdge2"}
            subTitle={uiConfig?.systemName || "CDN管理系统"}
            contentStyle={{ width: "100%", minWidth: 0 }}
            containerStyle={{ paddingInline: 0 }}
            onFinish={onLogin}
            submitter={{ submitButtonProps: { tabIndex: 3 } }}
          >
            <ProFormText
              name="username"
              fieldProps={{
                size: "large",
                prefix: <UserOutlined />,
                autoFocus: true,
                allowClear: true,
                tabIndex: 1,
              }}
              placeholder="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: "large",
                prefix: <LockOutlined />,
                allowClear: true,
                visibilityToggle: { tabIndex: -1 },
                tabIndex: 2,
              }}
              placeholder="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            />
            {uiConfig?.allowRememberLogin ? <ProFormCheckbox name="rememberMe">记住登录</ProFormCheckbox> : null}
          </LoginForm>
        )}

        {!showEnteringApp && step === "bind" && (
          <div style={{ padding: "24px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 33, fontWeight: 600, marginBottom: 8 }}>{uiConfig?.productName || "GoEdge2"}</div>
              <Typography.Text type="secondary">{uiConfig?.systemName || "CDN管理系统"}</Typography.Text>
            </div>
            <p style={{ textAlign: "center" }}>请使用 Google Authenticator 或其他 OTP 应用扫描二维码</p>
            <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
              <Suspense fallback={<Spin size="large" />}>
                <OtpQRCode value={otpAuthUrl} size={200} level="M" />
              </Suspense>
            </div>
            <Flex justify="center" style={{ marginBottom: 12 }}>
              <Input.OTP length={6} autoComplete="one-time-code" value={otpCode} onChange={handleOTPCodeChange} size="large" />
            </Flex>
            <Button type="primary" loading={otpLoading} block size="large" onClick={() => handleOTPVerify(true)}>
              验证并绑定
            </Button>
            <Button
              block
              size="large"
              style={{ marginTop: 8 }}
              onClick={() => {
                setStep("password");
                setOtpCode("");
              }}
            >
              返回
            </Button>
          </div>
        )}

        {!showEnteringApp && step === "verify" && (
          <div style={{ padding: "24px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 33, fontWeight: 600, marginBottom: 8 }}>{uiConfig?.productName || "GoEdge2"}</div>
              <Typography.Text type="secondary">{uiConfig?.systemName || "CDN管理系统"}</Typography.Text>
            </div>
            <p style={{ textAlign: "center", marginBottom: 24 }}>请输入 OTP 验证码</p>
            <Flex justify="center" style={{ marginBottom: 12 }}>
              <Input.OTP length={6} autoComplete="one-time-code" value={otpCode} onChange={handleOTPCodeChange} size="large" />
            </Flex>
            <Button type="primary" loading={otpLoading} block size="large" onClick={() => handleOTPVerify(false)}>
              验证
            </Button>
            <Button
              block
              size="large"
              style={{ marginTop: 8 }}
              onClick={() => {
                setStep("password");
                setOtpCode("");
              }}
            >
              返回
            </Button>
          </div>
        )}
      </Card>
    </Flex>
  );
}

export default Login;
