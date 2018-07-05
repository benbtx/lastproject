import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
export = VehicleCoverRecord;

class VehicleCoverRecord extends BaseWidget {
    baseClass = "widget-VehicleCoverRecord";
    toast = null;
    popup = null;
    loadWait=null;
    currentPopup=null;
    editlabel="add";//默认状态是添加add，编辑edit
    carid="";
    depid="";
    start_date="";
    end_date="";
    keyword = "";
    select_info={
        datas:[],
        ids:[],
        id:"",
        currentTarget:null
    };
    companyid = "";//公司id
    iszgs=false;//是否是总公司账号  
    ispartment=false;//是否为部门账号

    /**
     * @function 启动功能页面
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
        this.initLoginUser();
    }

    /**
     * @function 配置初始化
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.loadWait=this.AppX.runtimeConfig.loadWait;
    }

    /**
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();        
    }

    /**
     * @function 判断是否为集团账号或子公司账号
     */
    initCompany(){
        if(AppX.appConfig.groupid!=null && AppX.appConfig.groupid!=""){
            this.ispartment=true;
        }
        
        if(this.ispartment==false){
            if(AppX.appConfig.range.indexOf(";")>-1){
                var codes=AppX.appConfig.range.split(";");
                if(codes!=null && codes.length>0){
                    for(var i=0;i<codes.length;i++){
                        if(codes[i]==this.config.rangeall){
                            this.iszgs=true;
                            break;
                        }
                    }
                }  
            }else{
                if(AppX.appConfig.range==this.config.rangeall){
                    this.iszgs=true;
                }
            } 
        }       
    }

     /**
     * @function 根据不同账号获取headers
     * @param type 0获取自己及以下部门数据，1获取自身数据
     */
    getHeaders(type?:number){
        var headers=null;
        switch(type){
            case 0:
                headers={                
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range':AppX.appConfig.range
                };
                break;
            case 1:
                headers={                
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
            default:
                headers={                
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
        }
        return headers;
    }

    /**
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser(){           
        this.initCompany(); 
        this.initTimeControl();            
        if(this.iszgs==true){//集团公司账号 
            this.domObj.find(".company_serch").show();           
            this.getCompanyList();
            this.domObj.find('.company').on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();      
                this.setUserControl(this.companyid);       
                this.getGroup("department",this.domObj,true);//部门
                this.depid="";
                this.getCarLists(this.domObj,true,"carids");//车辆信息列表 
                this.setSearchVal("","","",""); 
                this.getCoverRecord();       
            }.bind(this));  
        }else{
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
            }else{
                this.depid="";
                this.getGroup("department",this.domObj,true);//部门                 
            }            
            this.getCarLists(this.domObj,true,"carids");//车辆信息列表 
            this.getCoverRecord();                  
        }
    } 

    /**
     * @function 控件是否可用
     * @param companyid 公司id
     */
    setUserControl(companyid){
        if(AppX.appConfig.departmentid==companyid){//可进行编辑操作
            this.domObj.find('.btn_add').prop("disabled",false);
            this.domObj.find('.btn_edit').prop("disabled",false);
            this.domObj.find('.btn_delete').prop("disabled",false);
        }else{
            this.domObj.find('.btn_add').prop("disabled",true);
            this.domObj.find('.btn_edit').prop("disabled",true);
            this.domObj.find('.btn_delete').prop("disabled",true);
        }
    } 

    /**
     * @function 获取公司列表信息
     */
    getCompanyList() {
        $.ajax({           
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,            
            success: function(results){                
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {                    
                    if(AppX.appConfig.departmentid==item.companyid){
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }else{
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid=this.domObj.find(".company option:selected").val();
                this.getGroup("department",this.domObj,true);//部门列表 
                this.depid="";
                this.getCarLists(this.domObj,true,"carids");//车辆信息列表                
                this.config.currentpage=1;     
                this.setSearchVal("","","","");   
                this.getCoverRecord();         
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    start = {
            format: 'YYYY-MM-DD',           
            isinitVal:false,
            choosefun: function(elem, val, date){
                var dt=new Date(val.replace(/-/g,"/"));
                this.end.minDate=Functions.DateFormat(dt,"yyyy-MM-dd");             
                this.domObj.find('.end_date').val(this.end.minDate);
            }.bind(this)
        };

    end = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: false,
        minDate:Functions.DateFormat(new Date(),"yyyy-MM-dd")
    };

    /**
     * @function 弹出框初始化时间控件
     */
    initTimeControl(){
         $.jeDate(".insuredate",{
            format: 'YYYY-MM-DD',   
            isinitVal: true
        });
        $.jeDate(".start_date",this.start);
        $.jeDate(".end_date",this.end);       
    }  

    /**
     * @function 设置查询条件
     * @param depid 部门id
     * @param carid 车辆id
     * @param start_date 开始日期
     * @param end_date 结束日期
     */
    setSearchVal(depid,carid,start_date,end_date){
        if(this.ispartment==false)
            this.depid=depid;
        this.carid=carid;
        this.start_date=start_date;
        this.end_date=end_date;
    } 

    /**
     * @function 事件初始化
     */
    initEvent() {
        var that=this;       
        this.domObj.find('.department').off("change").on("change", function () {  
            this.depid=this.domObj.find(".department option:selected").val();
            this.getCarLists(this.domObj,true,"carids");//车辆信息列表            
        }.bind(this));   

        //查询 click
        this.domObj.find('.btn_search').on("click", function () {           
            this.config.currentpage=1;
            this.setSearchVal(this.domObj.find(".department option:selected").val(),this.domObj.find(".carids option:selected").val(),this.domObj.find(".start_date").val(),this.domObj.find(".end_date").val());
            this.getCoverRecord();
        }.bind(this));

        //刷新 click
        this.domObj.find('.btn_refresh').on("click", function () {
            this.config.currentpage=1;     
            this.setSearchVal("","","","");   
            this.getCoverRecord();
        }.bind(this));

        //登记 click
        this.domObj.find('.btn_add').on("click", function () {
           this.showInfo(null,"新增",1);                 
        }.bind(this));

        //更新 click
        this.domObj.find('.btn_edit').on("click", function () {
            var that=this;
            if (this.select_info.currentTarget == null) {
                this.toast.Show("请选择投保记录信息！");
                return;
            }
           this.showInfo(this.select_info.currentTarget,"修改",2);
        }.bind(this));          

        //删除 click
        this.domObj.find('.btn_delete').on("click", function () {
            if (this.select_info.ids.length==0) {
                this.toast.Show("请选择投保记录信息！");
                return;
            }

            this.popup.setSize(this.config.popuptip.width, this.config.popuptip.height);
            var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
                $.ajax({
                    headers: this.getHeaders(0),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteCarInsure,
                    data: {
                        "list": this.select_info.ids
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.toast.Show(results.message);
                            return;
                        }                        
                        this.toast.Show(this.config.messages.delete);
                        this.config.currentpage=1;
                        this.getCoverRecord();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.delete);
                    }.bind(this)                    
                });
            }.bind(this));            
        }.bind(this));


        // 选中行高亮 click
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.select_info.currentTarget = $(e.currentTarget);                              
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.currentpage - 1 > 0) {
                this.config.currentpage = this.config.currentpage - 1;
                this.getCoverRecord();
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.getCoverRecord();
            }
        }.bind(this));

        //默认页条数修改
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize= parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());            
            this.getCoverRecord();           
        }.bind(this));

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.pagenumber && currpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getCoverRecord();
            }
        }.bind(this));

        //全选
        this.domObj.find('.select_cover_all_list').off("change").on("change", function () {
            if (this.domObj.find(".select_cover_all_list").prop('checked') == true) {
                this.domObj.find(".select_cover_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
                this.domObj.find(".select_cover_list").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddSelectItem(false,$(this));
                });
            }
        }.bind(that));       
    }

    /**
     * @function 获取投保记录信息列表
     */
    getCoverRecord() { 
        this.domObj.find('.select_cover_all_list').prop("checked",false);  
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);    
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            currentTarget:null
        };  
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCarInsureList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize": this.config.pagesize,
                "insurecar": this.carid,
                "deptid":this.depid,
                "insurestartdate":this.start_date,
                "insureenddate":this.end_date,
                "companyid":this.companyid
            },
            success: this.getCoverRecordListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getCoverRecordListCallback(results) {
        console.log(results);
        this.loadWait.Hide();     
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        if (results.result.total % this.config.pagesize == 0) {
            this.config.pagenumber = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));
        } else {
            this.config.pagenumber = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;
        }

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + that.config.currentpage + "页共" + that.config.pagenumber + "页");
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
        if (this.config.pagenumber == 0) {           
           this.domObj.find(".pagecontrol").text("总共-条，每页-条");
           this.domObj.find(".content").text("第-页共-页");
           this.domObj.find(".selectpagecontrol").text("，当前选中-条");
        }
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            var insuredate= (item.insuredate!=null &&item.insuredate!=""?Functions.DateFormat(new Date(item.insuredate.replace(/-/g,"/")),"yyyy-MM-dd"):"");
            html_trs_data += "<tr class=goto  data-id='" + item.id
             + "' data-insuredate='" + insuredate 
             + "' data-carid='" + item.carid
             + "' data-car='" + item.car
             + "' data-trafficforce_insurance='" + item.trafficforce_insurance 
             + "' data-commercial_insurance='" + item.commercial_insurance
             + "' data-carship_tax='" + item.carship_tax 
             + "' data-billamount='" + item.billamount            
             + "' data-notes='" + item.notes
             + "'><td class='checkwidth'><input type='checkbox' class='select_cover_list' data-id='" + item.id
             + "' data-insuredate='" + insuredate 
             + "' data-carid='" + item.carid
             + "' data-car='" + item.car 
             + "' data-trafficforce_insurance='" + item.trafficforce_insurance 
             + "' data-commercial_insurance='" + item.commercial_insurance
             + "' data-carship_tax='" + item.carship_tax 
             + "' data-billamount='" + item.billamount            
             + "' data-notes='" + item.notes
             +"'/></td><td title='"+item.dept+"'>" 
             + item.dept + "</td><td title='"+item.car+"'>" 
             + item.car + "</td><td title='"+insuredate+"'>" 
             + insuredate + "</td><td title='"+item.trafficforce_insurance+"'>"
             + item.trafficforce_insurance + "</td><td title='"+item.commercial_insurance+"'>" 
             + item.commercial_insurance + "</td><td title='"+item.carship_tax+"'>" 
             + item.carship_tax + "</td><td title='"+item.billamount+"'>"
             + item.billamount + "</td><td title='"+item.notes+"'>"
             + item.notes              
             + "</td></tr>";           
        }.bind(this));
        this.domObj.find(".coverlist").empty().append(html_trs_data);   
     
        //勾选
        this.domObj.find('.select_cover_list').off("change").on("change",function(e){  
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
        }.bind(that));    
    }   

    /**
     * @function 显示当前数据，可编辑，添加
     * @param target 对象
     * @param idx
     */
    showInfo(target,tit,idx){
        this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
        var Obj = this.popup.Show(tit, this.template.split('$$')[idx]);              
        this.currentPopup=Obj;
        var id="";
        if(target!=null){           
            this.editlabel="edit"; 
            id=target.data("id");
            Obj.conObj.find('.insuredate').val(target.data("insuredate"));
            Obj.conObj.find('.trafficforce_insurance').val(target.data("trafficforce_insurance"));
            Obj.conObj.find('.commercial_insurance').val(target.data("commercial_insurance"));
            Obj.conObj.find('.carship_tax').val(target.data("carship_tax"));
            Obj.conObj.find('.billamount').val(target.data("billamount"));
            Obj.conObj.find('.notes').val(target.data("notes"));                    
        }else{            
            this.editlabel="add";          
        }
        this.getCarList(Obj.conObj,false,"carid");       
        this.initTimeControl();
       
        (<any>$('#widget-VehicleCoverRecord_addpopup')).bootstrapValidator();
        //提交保存
        Obj.submitObj.off("click").on("click", function () {                
                var insuredate = Obj.conObj.find('.insuredate'); 
                var trafficforce_insurance = Obj.conObj.find('.trafficforce_insurance');
                var commercial_insurance = Obj.conObj.find('.commercial_insurance'); 
                var carship_tax = Obj.conObj.find('.carship_tax');  
                var billamount = Obj.conObj.find('.billamount');
                if (insuredate.val() == '') {
                    insuredate.addClass('has-error');                       
                    this.popup.ShowTip("投保日期不能为空！");
                    return;
                } 
                 
                
                $.ajax({
                    headers:this.getHeaders(0),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + (this.editlabel=="add"?this.config.addCarInsure:this.config.updateCarInsure),
                    data: {
                        "id":id,
                        "carid":Obj.conObj.find('.carid option:selected').val(),                        
                        "insuredate":Obj.conObj.find('.insuredate').val(),
                        "trafficforce_insurance":Obj.conObj.find('.trafficforce_insurance').val(),
                        "commercial_insurance":Obj.conObj.find('.commercial_insurance').val(),
                        "carship_tax":Obj.conObj.find('.carship_tax').val(),
                        "billamount":Obj.conObj.find('.billamount').val(),                    
                        "notes":Obj.conObj.find('.notes').val()
                    },
                    success: function(results){                        
                        console.log(results.message);
                        if(results.code!=1){
                            this.popup.ShowTip(results.message);
                            return;
                        }
                        this.popup.Close();
                        this.toast.Show(this.editlabel=="add"?this.config.messages.add:this.config.messages.update);
                        this.getCoverRecord(); 
                    }.bind(this),
                    error: function (data) {
                         this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)
                });                            
        }.bind(this));                             
    }

    /**----------------------------字典获取------------------------- */
    /**
     * @function 获取车辆列表
     * @param domObj
     * @param isall
     * @param controlname
     */
    getCarList(domObj,isall,controlname){
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "depid":this.depid,
                    "companyid":this.companyid,
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
                         if(this.select_info.currentTarget!=null && this.select_info.currentTarget.data("carid")==row.id && this.editlabel=="edit"){//编辑状态
                            stroption += "<option selected='selected' value='" + row.id + "'>" + row.plate_number + "</option>";
                        }else{
                            stroption += "<option value='" + row.id + "'>" + row.plate_number + "</option>";
                        }                                            
                    }.bind(this));
                    domObj.find('.'+controlname).empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
                }.bind(this)
            });
    } 

getCarLists(domObj,isall,controlname){
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "depid":this.depid,
                    "companyid":this.companyid,
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
                        stroption += "<option value='" + row.plate_number + "'>" + row.plate_number + "</option>";                                                                  
                    }.bind(this));
                    domObj.find('.'+controlname).empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
                }.bind(this)
            });
    } 
    /**
     * @function 获取部门列表
     * @param selectClass
     * @param domObj
     * @param isall
     */
    getGroup(selectClass,domObj,isall) {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid":this.companyid
            },
            success: function(results){
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "<option value='' selected>全部</option>";
                if(isall==false){
                    strdepartment="";
                }
                $.each(results.result.rows, function (index, item) {                    
                    strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";                    
                }.bind(this));
                domObj.find("."+selectClass).empty().append(strdepartment);
            }.bind(this),
            error: function (data) {
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }   

    /**
     * @function 添加或删除选中集合
     * @param ischecked 
     * @param currentTarget
     */
    removeOrAddSelectItem(ischecked,currentTarget){
        var item={ 
                "id": currentTarget.data('id')              
            };
        if (ischecked){//添加
              var isExist=0;
              for(var i=0;i<this.select_info.datas.length;i++){
                var arrSid=this.select_info.datas[i];
                if(arrSid.id==item.id){
                    isExist=1;
                    break;
                }
            }
            if(isExist==0){
                this.select_info.datas.push(item);
                this.select_info.ids.push(item.id);
            }
                
         }else{//取消
            var arrSids=[],ids=[];
            for(var i=0;i<this.select_info.datas.length;i++){
                var arrSid=this.select_info.datas[i];
                if(arrSid.id!=item.id){
                    ids.push(arrSid.id);
                    arrSids.push(arrSid);
                }
            }
           this.select_info.datas=arrSids;
           this.select_info.ids=ids;
        }
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
    } 

    /**
     * @function 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}