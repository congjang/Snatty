import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { Button, type ButtonProps } from "../app/components/Button";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Snatty 앱에서 사용하는 공용 버튼입니다. variant / level / size 조합과 fullWidth, loading 상태를 Storybook Controls에서 바로 테스트할 수 있습니다.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-screen items-center justify-center bg-[var(--colorBackgroundBase2Default,#f2f2f3)]">
        <div className="flex h-[844px] w-[390px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-[var(--colorBackgroundBase1Default,#ffffff)] shadow-xl">
          <Story />
        </div>
      </div>
    ),
  ],
  argTypes: {
    variant: { control: { type: "radio" }, options: ["contained", "outlined", "container"] },
    level: { control: { type: "radio" }, options: ["primary", "secondary", "tertiary"] },
    size: { control: { type: "radio" }, options: ["XL", "L", "M", "S"] },
    fullWidth: { control: "boolean" },
    loading: { control: "boolean" },
    leadingIcon: { control: false },
    trailingIcon: { control: false },
  },
  args: {
    children: "Button",
    variant: "contained",
    level: "primary",
    size: "L",
    fullWidth: false,
    loading: false,
  } satisfies Partial<ButtonProps>,
};

export default meta;

type Story = StoryObj<typeof Button>;

export const ContainedPrimary: Story = {};
export const OutlinedSecondary: Story = {
  args: { variant: "outlined", level: "secondary", children: "Outlined secondary" },
};
export const ContainerTertiaryFullWidth: Story = {
  args: { variant: "container", level: "tertiary", fullWidth: true, children: "Full width" },
};
export const LoadingState: Story = {
  args: { loading: true, children: "Loading…" },
};