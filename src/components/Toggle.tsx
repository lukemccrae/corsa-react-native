import { FC } from "react"
import { Switch, ViewStyle } from "react-native"

import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

interface ToggleProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  style?: ViewStyle
}

export const Toggle: FC<ToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
}) => {
  const { themed, colors } = useAppTheme()

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{
        false: colors.palette?.neutral200 ?? "#ccc",
        true: colors.palette?.success ?? "#4caf50",
      }}
      thumbColor={value ? (colors.palette?.success ?? "#4caf50") : (colors.palette?.neutral400 ?? "#999")}
      style={[themed($toggle), style]}
    />
  )
}

const $toggle: ThemedStyle<ViewStyle> = () => ({
  // React Native Switch has built-in styling
})
