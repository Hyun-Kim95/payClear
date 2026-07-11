import { LegalLayout } from '../components/LegalLayout'
import { LEGAL_META } from '../legal/config'

/** Play Console「계정 삭제 URL」용 — 삭제 절차·데이터 범위를 눈에 띄게 안내 */
export function AccountDeletionPage() {
  const { serviceName, operatorLabel, contactEmail } = LEGAL_META

  return (
    <LegalLayout title="계정 삭제 요청">
      <p>
        <strong>{serviceName}</strong>({operatorLabel}) 계정 및 관련 데이터를 삭제하는 방법을
        안내합니다.
      </p>

      <h2>앱에서 삭제 요청하기 (권장)</h2>
      <ol>
        <li>{serviceName} 앱에 로그인합니다.</li>
        <li>
          <strong>설정</strong>으로 이동합니다.
        </li>
        <li>
          <strong>회원 탈퇴</strong>를 선택합니다.
        </li>
        <li>안내를 확인한 뒤 탈퇴를 요청합니다. (앱 PIN이 설정된 경우 PIN 확인이 필요합니다.)</li>
      </ol>

      <h2>앱을 사용할 수 없는 경우</h2>
      <p>
        아래 이메일로 계정 삭제를 요청해 주세요. 요청 시 Google 또는 Kakao 로그인에 사용한
        이메일(또는 계정 식별에 필요한 정보)을 함께 적어 주세요.
      </p>
      <p>
        문의:{' '}
        <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`${serviceName} account deletion request`)}`}>
          {contactEmail}
        </a>
      </p>

      <h2>삭제·보관되는 데이터</h2>
      <ul>
        <li>
          <strong>삭제 요청 후 30일 유예:</strong> 이 기간 동안 같은 계정으로 다시 로그인하면 탈퇴
          요청이 취소됩니다.
        </li>
        <li>
          <strong>유예 기간 경과 후 영구 삭제:</strong> 회원 계정, 채무·상대·상환·조정 기록, 공유
          링크, 알림·푸시 토큰, 앱 잠금(PIN) 관련 서버 데이터 등 서비스에 저장된 계정 관련
          데이터가 삭제됩니다.
        </li>
        <li>
          <strong>추가 보관:</strong> 법령상 보관이 필요한 정보가 있는 경우에 해당 기간 동안 보관할
          수 있습니다.
        </li>
      </ul>

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        자세한 처리 방침은 <a href="/privacy">개인정보 처리방침</a>을 참고해 주세요.
      </p>
    </LegalLayout>
  )
}
