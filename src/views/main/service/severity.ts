

export const formatSeverityId = (severityId: number | null) => {
  switch (severityId) {
    case 0:
      return 'info';
      break;
    case 1:
      return 'minor';
      break;
    case 2:
      return 'major';
      break;
    case 3:
      return 'critical';
      break;
    default:
      throw new Error(`unKnown severityId: ${severityId}`);
      break;
  };
};

export const severityColor = (severityId: number) => {
  switch (severityId) {
    case 0:
      return '#A7AAB1';
      break;
    case 1:
      return '#408F34';
      break;
    case 2:
      return '#E7BD42';
      break;
    case 3:
      return '#DB5656';
      break;
    default:
      throw new Error(`unKnown severityId: ${severityId}`);
      break;
  };
};