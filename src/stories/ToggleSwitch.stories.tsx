import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import { ToggleSwitch } from "../app/components/ToggleSwitch";

const meta: Meta<typeof ToggleSwitch> = {
  title: "Components/ToggleSwitch",
  component: ToggleSwitch,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "radio",
      options: ["S", "M", "L"],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "라벨 + 스위치 컴포넌트입니다. size(S/M/L)에 따라 트랙/핸들 크기와 이동 거리, 스프링 모션이 달라집니다.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ToggleSwitch>;

function WithState(props: React.ComponentProps<typeof ToggleSwitch>) {
  const [checked, setChecked] = useState(props.checked ?? false);
  return <ToggleSwitch {...props} checked={checked} onChange={setChecked} />;
}

export const Medium: Story = {
  render: (args) => <WithState {...args} />,
  args: {
    size: "M",
    label: "알림 받기",
    checked: true,
  },
};

