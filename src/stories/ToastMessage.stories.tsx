import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { ToastMessage } from "../app/components/ToastMessage";

const meta: Meta<typeof ToastMessage> = {
  title: "Components/ToastMessage",
  component: ToastMessage,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "하단 Toast 메시지 컴포넌트입니다. variant(labelOnly / labelAction)에 따라 액션 버튼 유무가 달라집니다.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ToastMessage>;

export const LabelOnly: Story = {
  args: {
    label: "저장되었습니다",
    variant: "labelOnly",
  },
};

export const LabelAction: Story = {
  args: {
    label: "저장되었습니다",
    action: "실행 취소",
    variant: "labelAction",
  },
};

