import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
declare var echarts;

export = VehicleMouthReport;

class VehicleMouthReport extends BaseWidget {
    baseClass = "widget-VehicleMouthReport";
toast = null;
    popup = null;
    html="";
    search_obj={
        depid:"",
        mouth_date:""
    }

    /**
     * @function 启动
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    /**
     * @function 配置
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;       
    }

    /**
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
        this.initTimeControl();
        this.getGroup(true,this.domObj.find(".department"));//部门列表      
    }

    /**
     * @function 初始化时间控件
     */
    initTimeControl(){
        $.jeDate(".mouth_date",{
            format: 'YYYY-MM', //日期格式  
            isinitVal: false
        });
        var dt=new Date();       
        this.domObj.find(".mouth_date").val(Functions.DateFormat(dt,"yyyy-MM"));
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent(){
        this.search_obj={
            depid:this.domObj.find(".department option:selected").val(),
            mouth_date:this.domObj.find(".mouth_date").val(),
        }  
    }

    /**
     * @function 初始化事件
     */
    initEvent() {
        this.search_obj={
            depid:"",
            mouth_date:this.domObj.find(".mouth_date").val()
        }
        this.getVehicleDepartmentMouthReport();
       
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            this.setSearchContent();        
            this.getVehicleDepartmentMouthReport();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {           
           (<any>$(".planweeklystatistics-list")).print({                    
                    globalStyles: false,
                    mediaPrint: false,
                    stylesheet: "widgets/PlanWeeklyStatistics/css/style.css",
                    iframe: true,
                    noPrintSelector: ".no-print",
                    prepend: "",
                    append: ""
                });
        }.bind(this));

        //导出
        this.domObj.find('.btn_export').on("click", function () { 
           mothedexport();
        }.bind(this));
    }

    /**
     * @function 公司车辆月报
     */
    getVehicleDepartmentMouthReport() {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,                
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleDepartmentMouthReport,
            data: {
                "q_mouth_date": this.search_obj.mouth_date,
                "companyid": this.search_obj.depid
            },
            success: this.getVehicleDepartmentMouthReportCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getVehicleDepartmentMouthReportCallback(results) {
        console.log(results);
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }       
        var data = results.result;
        this.html="";
        if(data!=null && data.length>0){
            for(var i=0;i<data.length;i++){
                this.html+="<td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td><td>"+data[i]
                        +"</td>";       
            }
        }

        this.domObj.find(".vehiclemouthreportcaption").text("时间："+this.domObj.find(".mouth_date").val());            
        this.domObj.find(".departmentmouthreportlist").empty().append(this.html); 
        var myDate = new Date();
        var mytime=Functions.DateFormat(myDate,"yyyy年MM月dd日 hh:mm:ss");            
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人："+AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);            
    }
    

    /**--------------------------查询字典---------------------*/
    /**
     * @function 部门列表
     * @param isall 是否显示全部
     * @param obj 对象
     */
    getGroup(isall,obj) {
        $.ajax({
            headers: {                
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: function(results){
                console.log(results);
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";
                if(isall==true){
                    strdepartment="<option value=''>全部</option>"
                }
                $.each(results.result.rows, function (index, item) {
                    strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
                }.bind(this));
                obj.empty().append(strdepartment);
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    } 
     
    /**
     * @function 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}