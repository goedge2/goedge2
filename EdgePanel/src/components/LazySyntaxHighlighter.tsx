import { Suspense, lazy, type ComponentProps, type CSSProperties } from "react";
import { Flex, Spin } from "antd";

export type SyntaxThemeName = "oneDark" | "oneLight" | "atomDark";
type SyntaxLanguage = "yaml" | "diff";

type BaseSyntaxHighlighterProps = {
  language: SyntaxLanguage;
  theme: SyntaxThemeName;
  customStyle?: CSSProperties;
  showLineNumbers?: boolean;
  wrapLines?: boolean;
  wrapLongLines?: boolean;
  codeTagProps?: ComponentProps<"code">;
  children: string;
};

type RuntimeSyntaxHighlighterProps = BaseSyntaxHighlighterProps;

const RuntimeSyntaxHighlighter = lazy(async () => {
  const [{ default: PrismLight }, yaml, diff, { default: oneDark }, { default: oneLight }, { default: atomDark }] = await Promise.all([
    import("react-syntax-highlighter/dist/esm/prism-light"),
    import("react-syntax-highlighter/dist/esm/languages/prism/yaml"),
    import("react-syntax-highlighter/dist/esm/languages/prism/diff"),
    import("react-syntax-highlighter/dist/esm/styles/prism/one-dark"),
    import("react-syntax-highlighter/dist/esm/styles/prism/one-light"),
    import("react-syntax-highlighter/dist/esm/styles/prism/atom-dark"),
  ]);

  PrismLight.registerLanguage("yaml", yaml.default);
  PrismLight.registerLanguage("diff", diff.default);

  const themes = {
    oneDark,
    oneLight,
    atomDark,
  } as const;

  // biome-ignore lint/correctness/noComponentHookFactories: React.lazy caches this module-level loader and its component.
  function SyntaxHighlighterRenderer({ theme, ...props }: RuntimeSyntaxHighlighterProps) {
    return <PrismLight {...props} style={themes[theme]} />;
  }

  return { default: SyntaxHighlighterRenderer };
});

const buildFallbackStyle = (customStyle?: CSSProperties): CSSProperties => ({
  minHeight: 96,
  margin: 0,
  padding: 16,
  borderRadius: 8,
  ...customStyle,
});

export default function LazySyntaxHighlighter(props: BaseSyntaxHighlighterProps) {
  return (
    <Suspense
      fallback={
        <Flex align="center" justify="center" style={buildFallbackStyle(props.customStyle)}>
          <Spin size="small" />
        </Flex>
      }
    >
      <RuntimeSyntaxHighlighter {...props} />
    </Suspense>
  );
}
