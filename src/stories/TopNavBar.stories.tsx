import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { TopNavBar, type TopNavBarProps } from "../app/components/TopNavBar";

const meta: Meta<typeof TopNavBar> = {
  title: "Components/TopNavBar",
  component: TopNavBar,
  tags: ["autodocs"],
  args: {
    date: "2024.12.02",
    headline: "오늘의 기록",
  } satisfies Partial<TopNavBarProps>,
  argTypes: {
    type: {
      control: "radio",
      options: ["Profile", "Large title", "Small title", "Sub", "Popup", "date+viewmode"],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Snatty 앱 상단 내비게이션 바입니다. type에 따라 레이아웃과 우측 액션 구성이 달라집니다. Large title, date+viewmode 등을 Storybook에서 바로 확인할 수 있습니다.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof TopNavBar>;

export const LargeTitle: Story = {
  args: {
    type: "Large title",
    date: "3월 16일 (월)",
    headline: "오늘의 기록",
    weatherLocation: "서대문구 연희동",
    weatherTemp: "-1°C",
    weatherExtra: "미세먼지 좋음",
  },
};

export const DateViewMode: Story = {
  args: {
    type: "date+viewmode",
    date: "2024.12.02",
  },
};

