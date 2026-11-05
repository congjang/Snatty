import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { Calendar } from "../app/components/Calendar";

const meta: Meta<typeof Calendar> = {
  title: "Components/Calendar",
  component: Calendar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "달력 컴포넌트입니다. view(month/week)에 따라 월간/주간 레이아웃으로 렌더링됩니다. todayOverride를 사용해 특정 날짜를 오늘로 고정해 테스트할 수 있습니다.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

export const Month: Story = {
  args: {
    view: "month",
    todayOverride: new Date(2024, 11, 16),
  },
};

export const Week: Story = {
  args: {
    view: "week",
    todayOverride: new Date(2024, 11, 16),
  },
};

