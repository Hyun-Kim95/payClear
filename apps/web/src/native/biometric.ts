import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export const BIOMETRIC_ENABLED_KEY = 'payclear-biometric-enabled'

export async function getBiometricEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  const { value } = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY })
  return value === 'true'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (enabled) {
    await Preferences.set({ key: BIOMETRIC_ENABLED_KEY, value: 'true' })
  } else {
    await Preferences.remove({ key: BIOMETRIC_ENABLED_KEY })
  }
}

export async function verifyBiometricUnlock(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    const available = await NativeBiometric.isAvailable()
    if (!available.isAvailable) return false

    await NativeBiometric.verifyIdentity({
      reason: 'payClear 잠금 해제',
      title: '잠금 해제',
      subtitle: '생체 인증으로 확인해 주세요',
      description: '',
    })
    return true
  } catch {
    return false
  }
}
