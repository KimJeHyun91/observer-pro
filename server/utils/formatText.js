exports.formatSOPText = (data, clearStage) => {
  // sop_stage 기준으로 그룹화
  const grouped = data.reduce((acc, item) => {
    if (!acc[item.sop_stage]) acc[item.sop_stage] = [];
    acc[item.sop_stage].push(item);
    return acc;
  }, {});

  // 각 단계별 텍스트 포맷 생성
  let result = "";
  Object.keys(grouped).forEach(stage => {
    if(stage > clearStage) {
      return;
    }
    result += `SOP ${stage} 단계\n`;
    result += "----------------------------------------------\n";
    grouped[stage].forEach(item => {
      result += `${item.sop_stage_name} : `;
      result += `${item.sop_stage_description}\n`;
    });
    result += "\n"; // 단계 간 줄바꿈
  });

  return result.trim();
}
