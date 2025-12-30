exports.format_time = (date) => {
	var str = "";
	str += date.getFullYear();
	str += "-"+num_to_str(date.getMonth()+1);
	str += "-"+num_to_str(date.getDate());
	str += " "+num_to_str(date.getHours());
	str += ":"+num_to_str(date.getMinutes());
	str += ":"+num_to_str(date.getSeconds());
	return str;
}

const num_to_str = ($num) => {
	$num < 10 ? $num = '0' + $num : $num;
	return $num.toString();
}

exports.format_date = (date) => {
	var str = "";
	str += date.getFullYear();
	str += "-"+num_to_str(date.getMonth()+1);
	str += "-"+num_to_str(date.getDate());
	return str;
}

exports.paydate_paytime = (date, time) => {

  const year  = parseInt(date.slice(0, 4), 10);
  const month = parseInt(date.slice(4, 6), 10) - 1; // JS는 0~11월
  const day   = parseInt(date.slice(6, 8), 10);

  const hour  = parseInt(time.slice(0, 2), 10);
  const minute= parseInt(time.slice(2, 4), 10);
  const second= parseInt(time.slice(4, 6), 10);

  return new Date(year, month, day, hour, minute, second);
}
