kit-start 스킬(`.cursor/skills/kit-start/SKILL.md`) 절차를 따른다.

제품 루트에서 kit submodule `fetch`/`pull` 후 `.cursor-kit.json` 채널에 맞게 rules·skills·agents·훅을 sync한다.

`kit-start-last.json`의 `at`이 이번 요청 기준 2분 이상 지나 있으면 `vendor/.../scripts/Invoke-KitStart.ps1`(또는 `.cursor-kit.json`의 `kitPath`)를 Shell로 직접 실행한다.

접두어·슬래시 스킬만이면 sync 요약만 보고한다. 뒤에 작업 지시가 있으면 sync 후 그 지시만 수행한다.
