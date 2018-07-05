import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');

export = VehicleMilegeInfoStatistics;

class VehicleMilegeInfoStatistics extends BaseWidget {
    baseClass = "widget-VehicleMilegeInfoStatistics";
    toast = null;
    popup = null;
    html="";
    search_obj={
        depid:"",
        carid:"",
        daily_date:""
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
        this.getCarList(true,this.domObj.find(".plate_number"));//车辆列表      
    }

    /**
     * @function 初始化时间控件
     */
    initTimeControl(){
        $.jeDate(".daily_date",{
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: false
        });
        var dt=new Date();       
        this.domObj.find(".daily_date").val(Functions.DateFormat(dt,"yyyy-MM-dd"));
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent(){
        this.search_obj={
            depid:this.domObj.find(".department option:selected").val(),
            daily_date:this.domObj.find(".daily_date").val(),
            carid:this.domObj.find(".plate_number option:selected").val()
        }  
    }

    /**
     * @function 初始化事件
     */
    initEvent() {
        this.search_obj={
            carid:"",
            depid:"",
            daily_date:this.domObj.find(".daily_date").val()
        }
        this.getVehicleDailyReport();
       
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            this.setSearchContent();        
            this.getVehicleDailyReport();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {           
            print();
        }.bind(this));

        //导出
        this.domObj.find('.btn_export').on("click", function () { 
           mothedexport();
        }.bind(this));
    }

    /**
     * @function 车辆日报
     */
    getVehicleDailyReport() {
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,                
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleDailyReport,
            data: {
                "q_daily_date": this.search_obj.daily_date,
                "carid": this.search_obj.carid,
                "companyid": this.search_obj.depid
            },
            success: this.getVehicleDailyReportCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getVehicleDailyReportCallback(results) {
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
                        +"</td>";       
            }
        }

        this.domObj.find(".vehicledailyreportcaption").text("查询日期："+this.domObj.find(".daily_date").val());            
        this.domObj.find(".vehicledailyreportlist").empty().append(this.html); 
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
     * @function 获取车辆列表
     * @param isall
     * @param obj
     */
    getCarList(isall,obj){
        $.ajax({
                headers: {                    
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                },
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize
                },
                success: function (result) {
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = "<option value=''>全部</option>";
                    if(isall==false){
                        stroption="";
                    }
                    result.result.rows.forEach(function (row) {                       
                        stroption += "<option value='" + row.id + "'>" + row.plate_number + "</option>";                                           
                    }.bind(this));
                    obj.empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip("服务端ajax出错，获取数据失败!");
                }.bind(this)
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