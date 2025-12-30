exports.modifyAccessCtlPerson = async () => {

  let query = `
  UPDATE ob_access_control_person
  SET
    next_of_kin_name = $2
    , next_of_kin_contact1 = $3
    , next_of_kin_contact2 = $4
    , use_sms = $5
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
};

exports.getAccessCtlPerson = ({
  studentId,
  studentName,
  className
}) => {

  const conditions = [];
  const binds = [];
  let index = 1;

  if (studentId) {
    conditions.push(`student_id = $${index++}`);
    binds.push(studentId);
  }

  if (studentName) {
    conditions.push(`student_name = $${index++}`);
    binds.push(studentName);
  }

  if (className) {
    conditions.push(`class_name = $${index++}`);
    binds.push(className);
  };
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let query = `
  SELECT
    idx
    , student_id
    , student_name
    , student_contact
    , school_id
    , school_name
    , class_id
    , class_name
    , next_of_kin_name
    , next_of_kin_contact1
    , next_of_kin_contact2
    , use_sms
  FROM
    ob_access_control_person
  ${whereClause}
  ORDER BY
  idx ASC
  `;
  return { query, binds };
};

exports.removeAccessCtlPerson = async () => {

  let query = `
  DELETE FROM ob_access_control_person
  WHERE
    idx = $1;
  `;
  return query;
};
