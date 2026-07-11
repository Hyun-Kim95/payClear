import { LegalLayout } from '../components/LegalLayout'
import { LEGAL_META } from '../legal/config'

/** Play Console「데이터 삭제 URL」용 — 계정 유지 상태에서 데이터 삭제 방법 */
export function DataDeletionPage() {
  const { serviceName, operatorLabel, contactEmail } = LEGAL_META

  return (
    <LegalLayout title="데이터 삭제 요청">
      <p>
        <strong>{serviceName}</strong>({operatorLabel})에서 <strong>계정을 삭제하지 않고</strong> 일부
        또는 관련 데이터를 삭제하는 방법을 안내합니다. 계정 전체 삭제는{' '}
        <a href="/delete-account">계정 삭제 요청</a>을 참고하세요.
      </p>

      <h2>앱에서 데이터 삭제하기 (권장)</h2>
      <p>로그인 후 아래처럼 원하는 데이터만 삭제할 수 있습니다.</p>
      <ol>
        <li>
          <strong>채무 기록:</strong> 채무 상세에서 보관하거나 완전 삭제합니다. (정책에 따라 확인 절차가
          있을 수 있습니다.)
        </li>
        <li>
          <strong>상환·조정 기록:</strong> 해당 항목을 삭제하면 잔액이 다시 계산됩니다.
        </li>
        <li>
          <strong>공유 링크:</strong> 공유 화면에서 링크를 회수하면 외부 조회가 즉시 중단됩니다.
        </li>
        <li>
          <strong>알림·기기 토큰:</strong> 설정 → 알림에서 푸시를 끄거나 등록을 해제할 수 있습니다.
        </li>
      </ol>

      <h2>앱을 사용할 수 없는 경우</h2>
      <p>
        아래 이메일로 데이터 삭제를 요청해 주세요. 삭제하고 싶은 데이터 범위(예: 특정 채무, 전체
        기록)와 로그인에 사용한 이메일(또는 계정 식별 정보)을 함께 적어 주세요. 계정 자체는 유지한 채
        처리합니다.
      </p>
      <p>
        문의:{' '}
        <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`${serviceName} data deletion request`)}`}>
          {contactEmail}
        </a>
      </p>

      <h2>삭제·보관되는 데이터</h2>
      <ul>
        <li>
          <strong>삭제 요청·앱 내 삭제 시:</strong> 요청(또는 삭제한) 범위의 채무·상대·상환·조정
          기록, 해당 공유 링크, 관련 알림 설정·토큰 등이 삭제되거나 비활성화됩니다.
        </li>
        <li>
          <strong>계정 유지:</strong> 로그인 계정과 삭제하지 않은 다른 기록은 그대로 남습니다.
        </li>
        <li>
          <strong>추가 보관:</strong> 법령상 보관이 필요한 정보가 있는 경우에 해당 기간 동안 보관할
          수 있습니다.
        </li>
      </ul>

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        계정 전체 삭제(30일 유예 후 영구 삭제)는 <a href="/delete-account">계정 삭제 요청</a>, 처리
        방침은 <a href="/privacy">개인정보 처리방침</a>을 참고해 주세요.
      </p>
    </LegalLayout>
  )
}
