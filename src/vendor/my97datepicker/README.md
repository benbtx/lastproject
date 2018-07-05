# My97DatePicker
时间控件调用，支持自定义默认时间时分秒
//重置时间控件的时间，初始值自定义

function resetBeginTime(){
	if($dp.focusArr==undefined){
		setTimeout("resetBeginTime()", 10);
	}else{
		for(var i=0;i<$dp.focusArr.length;i++){
				if($dp.focusArr[i].className=="tB"){
					$dp.focusArr[i].value="00";
					$dp.focusArr[i+1].value="00";
					$dp.focusArr[i+2].value="00";
				}
			}
			$dp.cal.newdate.H=0;
			$dp.cal.newdate.m=0;
			$dp.cal.newdate.s=0;
		}
	}

function resetEndTime(){
	if($dp.focusArr==undefined){
		setTimeout("resetBeginTime()", 10);
	}else{
		for(var i=0;i<$dp.focusArr.length;i++){
				if($dp.focusArr[i].className=="tB"){
					$dp.focusArr[i].value="23";
					$dp.focusArr[i+1].value="59";
					$dp.focusArr[i+2].value="59";
				}
			}
			$dp.cal.newdate.H=23;
			$dp.cal.newdate.m=59;
			$dp.cal.newdate.s=59;
		}
	}
  
  

<input type="text" id="startTime" onclick="WdatePicker({dateFmt:'yyyy-MM-dd HH:mm:ss',readOnly:true,minDate:'%y-%M-%d',alwaysUseStartDate:true});resetBeginTime();" />
<input type="text" id="endTime" onclick="WdatePicker({dateFmt:'yyyy-MM-dd HH:mm:ss',readOnly:true,minDate:'%y-%M-%d',alwaysUseStartDate:true});resetEndTime();" />
