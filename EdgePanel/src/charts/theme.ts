import * as echarts from "echarts";
import type { GlobalToken } from "antd";

export const createEChartsTheme = (token: GlobalToken) => ({
  color: [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorError,
    token.colorInfo,
    token.purple,
    token.cyan,
    token.magenta,
    token.volcano,
    token.gold,
  ],
  backgroundColor: "transparent",
  textStyle: {
    color: token.colorText,
    fontFamily: token.fontFamily,
  },
  title: {
    textStyle: { color: token.colorText },
    subtextStyle: { color: token.colorTextSecondary },
  },
  line: {
    itemStyle: {
      borderWidth: 1,
    },
    lineStyle: {
      width: 2,
    },
    symbolSize: 4,
    symbol: "emptyCircle",
    smooth: false,
  },
  radar: {
    itemStyle: {
      borderWidth: 1,
    },
    lineStyle: {
      width: 2,
    },
    symbolSize: 4,
    symbol: "emptyCircle",
    smooth: false,
  },
  bar: {
    itemStyle: {
      barBorderWidth: 0,
      barBorderColor: token.colorBorder,
    },
  },
  pie: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  scatter: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  boxplot: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  parallel: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  sankey: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  funnel: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  gauge: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
  },
  candlestick: {
    itemStyle: {
      color: token.colorError,
      color0: token.colorSuccess,
      borderColor: token.colorError,
      borderColor0: token.colorSuccess,
      borderWidth: 1,
    },
  },
  graph: {
    itemStyle: {
      borderWidth: 0,
      borderColor: token.colorBorder,
    },
    lineStyle: {
      width: 1,
      color: token.colorBorder,
    },
    symbolSize: 4,
    symbol: "emptyCircle",
    smooth: false,
    color: [token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorError, token.colorInfo],
    label: {
      color: token.colorText,
    },
  },
  map: {
    itemStyle: {
      areaColor: token.colorBgLayout,
      borderColor: token.colorBorder,
      borderWidth: 0.5,
    },
    label: {
      color: token.colorText,
    },
    emphasis: {
      itemStyle: {
        areaColor: token.colorFillSecondary,
        borderColor: token.colorBorder,
        borderWidth: 1,
      },
      label: {
        color: token.colorText,
      },
    },
  },
  geo: {
    itemStyle: {
      areaColor: token.colorBgLayout,
      borderColor: token.colorBorder,
      borderWidth: 0.5,
    },
    label: {
      color: token.colorText,
    },
    emphasis: {
      itemStyle: {
        areaColor: token.colorFillSecondary,
        borderColor: token.colorBorder,
        borderWidth: 1,
      },
      label: {
        color: token.colorText,
      },
    },
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisLabel: {
      show: true,
      color: token.colorTextSecondary,
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: token.colorBorderSecondary,
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: [token.colorFillQuaternary, "rgba(250,250,250,0.3)"],
      },
    },
  },
  valueAxis: {
    axisLine: {
      show: false,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisTick: {
      show: false,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisLabel: {
      show: true,
      color: token.colorTextSecondary,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: token.colorBorderSecondary,
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: [token.colorFillQuaternary, "rgba(250,250,250,0.3)"],
      },
    },
  },
  logAxis: {
    axisLine: {
      show: false,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisTick: {
      show: false,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisLabel: {
      show: true,
      color: token.colorTextSecondary,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: token.colorBorderSecondary,
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: [token.colorFillQuaternary, "rgba(250,250,250,0.3)"],
      },
    },
  },
  timeAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: token.colorBorder,
      },
    },
    axisLabel: {
      show: true,
      color: token.colorTextSecondary,
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: token.colorBorderSecondary,
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: [token.colorFillQuaternary, "rgba(250,250,250,0.3)"],
      },
    },
  },
  toolbox: {
    iconStyle: {
      borderColor: token.colorTextSecondary,
    },
    emphasis: {
      iconStyle: {
        borderColor: token.colorText,
      },
    },
  },
  legend: {
    textStyle: {
      color: token.colorText,
    },
  },
  tooltip: {
    backgroundColor: token.colorBgElevated,
    borderColor: token.colorBorder,
    textStyle: {
      color: token.colorText,
    },
    axisPointer: {
      lineStyle: {
        color: token.colorBorder,
        width: 1,
      },
      crossStyle: {
        color: token.colorBorder,
        width: 1,
      },
    },
  },
  timeline: {
    lineStyle: {
      color: token.colorBorder,
      width: 1,
    },
    itemStyle: {
      color: token.colorBorder,
      borderWidth: 1,
    },
    controlStyle: {
      color: token.colorTextSecondary,
      borderColor: token.colorBorder,
      borderWidth: 0.5,
    },
    checkpointStyle: {
      color: token.colorPrimary,
      borderColor: token.colorPrimaryBorder,
    },
    label: {
      color: token.colorTextSecondary,
    },
    emphasis: {
      itemStyle: {
        color: token.colorPrimary,
      },
      controlStyle: {
        color: token.colorText,
        borderColor: token.colorText,
        borderWidth: 0.5,
      },
      label: {
        color: token.colorText,
      },
    },
  },
  visualMap: {
    color: [token.colorPrimary, token.colorFillSecondary],
  },
  dataZoom: {
    backgroundColor: token.colorFillQuaternary,
    dataBackgroundColor: token.colorFillTertiary,
    fillerColor: "rgba(255,255,255,0.2)",
    handleColor: token.colorTextSecondary,
    handleSize: "100%",
    textStyle: {
      color: token.colorTextSecondary,
    },
  },
  markPoint: {
    label: {
      color: token.colorTextLightSolid,
    },
    emphasis: {
      label: {
        color: token.colorTextLightSolid,
      },
    },
  },
});

export const registerAntdThemes = (token: GlobalToken) => {
  echarts.registerTheme("antd-light", createEChartsTheme(token));
  echarts.registerTheme("antd-dark", createEChartsTheme(token));
};
