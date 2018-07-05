import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
export = VehicleDriverBaseInfoManagement;

class VehicleDriverBaseInfoManagement extends BaseWidget {
    baseClass = "widget-VehicleDriverBaseInfoManagement";
    toast = null;
    popup = null;
    loadWait=null;
    currentPopup=null;
    editlabel="add";//默认状态是添加add，编辑edit
    keyword = "";
    select_info={
        datas:[],
        ids:[],
        id:"",
        currentTarget:null
    };

    companyid = "";//公司id
    companydatas=null;
    iszgs=false;//是否是总公司账号
    ispartment=false;
    depid="";

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
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser(){
       this.initCompany();    
        if(this.iszgs==true){//集团公司账号
            this.companydatas=new Object(); 
            this.domObj.find(".company_serch").show();
            this.getCompanyList();           
            this.domObj.find('.company').on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();  
                this.setButtonInUse(this.companyid);           
                this.getInitGroup(true,this.domObj.find(".department")); 
            }.bind(this));  
        }else{            
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();  
                this.getDriver();              
            }else{
                this.getInitGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息
            }          
        }
    }

    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?:string){
        if(this.iszgs){//总公司账号
            if(companyid==AppX.appConfig.departmentid){//可使用
                this.domObj.find('.btn_add').prop('disabled',false);
                this.domObj.find('.btn_edit').prop('disabled',false);
                this.domObj.find('.btn_delete').prop('disabled',false);                
            }else{//不可使用
                this.domObj.find('.btn_add').prop('disabled',true);
                this.domObj.find('.btn_edit').prop('disabled',true);
                this.domObj.find('.btn_delete').prop('disabled',true);               
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
                    this.companydatas[item.companyid]=item.company_name;
                    if(AppX.appConfig.departmentid==item.companyid){
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }else{
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid=this.domObj.find(".company option:selected").val(); 
                this.getInitGroup(true,this.domObj.find(".department")); 
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
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
     * @function 弹出框初始化时间控件
     */
    initTimeControl(){
         $.jeDate(".issue_date",{
            format: 'YYYY-MM-DD',   
            isinitVal: false
        });
         $.jeDate(".transfertodriverdate",{
            format: 'YYYY-MM',  
            isinitVal: false
        });
         $.jeDate(".birthday",{
            format: 'YYYY-MM',  
            isinitVal: false
        });
    }

    /**
     * @function 初始化字典表
     */
    initDicControl(){
        this.getGroup();//部门
        this.getDicOther("sex",false);//性别
        this.getDicOther("education",true);
        this.getDicOther("driving_skill_level",true);
        this.getDicOther("driving_license_type",true);
        this.getDicOther("is_part_time",true);
        this.getDicOther("whether_external",true);
    }

    /**
     * @function 事件初始化
     */
    initEvent() {
        var that=this;
        //查询 click
        this.domObj.find('.btn_search').on("click", function () {
            this.keyword = this.domObj.find('.search_condition').val();
            this.config.currentpage=1;
            this.getDriver();
        }.bind(this));

        //刷新 click
        this.domObj.find('.btn_refresh').on("click", function () {  
            this.keyword =""; 
            this.config.currentpage=1;        
            this.getDriver();
        }.bind(this));

        //登记 click
        this.domObj.find('.btn_add').on("click", function () {
            this.editlabel="add";
           this.showInfo(null,"新增");                 
        }.bind(this));

        //更新 click
        this.domObj.find('.btn_edit').on("click", function () {
            var that=this;
            if (this.select_info.currentTarget == null) {
                this.toast.Show("请选择司机信息！");
                return;
            }
            this.editlabel="edit";
           this.showInfo(this.select_info.currentTarget,"修改");
        }.bind(this));          

        //删除 click
        this.domObj.find('.btn_delete').on("click", function () {
            if (this.select_info.ids.length==0) {
                this.toast.Show("请选择司机信息！");
                return;
            }

            this.popup.setSize(this.config.popuptip.width, this.config.popuptip.height);
            var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteDriver,
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
                        this.getDriver();
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
                this.getDriver();
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.getDriver();
            }
        }.bind(this));

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.pagenumber && currpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getDriver();
            }
        }.bind(this));

        //页面条数控件
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getDriver();
        }.bind(this));

        //全选
        this.domObj.find('.select_driver_all_list').off("change").on("change", function () {
            if (this.domObj.find(".select_driver_all_list").prop('checked') == true) {
                this.domObj.find(".select_driver_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
                this.domObj.find(".select_driver_list").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddSelectItem(false,$(this));
                });
            }
        }.bind(that));       
    }

    /**
     * @function 获取司机信息列表
     */
    getDriver() {
        if(this.ispartment==false){
            this.depid=this.domObj.find('.department option:selected').val();
        } 
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            currentTarget:null
        };  
        this.domObj.find(".select_driver_all_list").prop('checked',false);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDriverList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize": this.config.pagesize,
                "companyid":this.companyid,
                "deptid":this.depid,
                "keyword": this.keyword
            },
            success: this.getDriverListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getDriverListCallback(results) {  
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
            var transfertodriverdate= (item.transfertodriverdate!=null &&item.transfertodriverdate!=""?Functions.DateFormat(new Date((item.transfertodriverdate.replace(/-/g,"/"))),"yyyy-MM"):"");
            var issue_date=(item.issue_date!=null&&item.issue_date!=""?Functions.DateFormat(new Date(item.issue_date.replace(/-/g,"/")),"yyyy-MM-dd"):"");
            var birthday= (item.birthday!=null &&item.birthday!=""?Functions.DateFormat(new Date(item.birthday.replace(/-/g,"/")),"yyyy-MM"):"");
            html_trs_data += "<tr class=goto  data-id='" + item.id
             + "' data-name='" + item.name 
             + "' data-phone='" + item.phone
             + "' data-address='" + item.address 
             + "' data-sex='" + item.sex
             + "' data-birthday='" + birthday
             + "' data-education='" + item.education
             + "' data-license_number='" + item.license_number
             + "' data-depid='" + item.depid
             + "' data-driving_skill_level='" + item.driving_skill_level
             + "' data-driving_license_type='" + item.driving_license_type
             + "' data-driving_file_code='" + item.driving_file_code
             + "' data-issue_date='" + issue_date
             + "' data-transfertodriverdate='" + transfertodriverdate
             + "' data-is_part_time='" + item.is_part_time
             + "' data-whether_external='" + item.whether_external
             + "' data-notes='" + item.notes                                   
             + "'><td class='checkwidth'><input type='checkbox' class='select_driver_list' data-id='" + item.id
             + "' data-name='" + item.name 
             + "' data-phone='" + item.phone
             + "' data-address='" + item.address 
             + "' data-sex='" + item.sex
             + "' data-birthday='" + birthday
             + "' data-education='" + item.education
             + "' data-license_number='" + item.license_number
             + "' data-depid='" + item.depid
             + "' data-driving_skill_level='" + item.driving_skill_level
             + "' data-driving_license_type='" + item.driving_license_type
             + "' data-driving_file_code='" + item.driving_file_code
             + "' data-issue_date='" + issue_date
             + "' data-transfertodriverdate='" + transfertodriverdate
             + "' data-is_part_time='" + item.is_part_time
             + "' data-whether_external='" + item.whether_external
             + "' data-notes='" + item.notes
             +"'/></td><td title='"+item.name+"'>" + item.name + "</td><td title='"+item.sex+"'>" 
             + item.sex + "</td><td title='"+item.depname+"'>" 
             + item.depname + "</td><td title='"+item.license_number+"'>" 
             + item.license_number + "</td><td title='"+item.driving_file_code+"'>"
             + item.driving_file_code + "</td><td title='"+item.driving_license_type+"'>" 
             + item.driving_license_type + "</td><td title='"+issue_date+"'>" 
             + issue_date + "</td><td title='"+transfertodriverdate+"'>"
              + transfertodriverdate + "</td><td title='"+(item.is_part_time==1||item.is_part_time==0?this.config.isrun[item.is_part_time]:"")+"'>"
             + (item.is_part_time==1||item.is_part_time==0?this.config.isrun[item.is_part_time]:"") + "</td><td title='"+(item.whether_external==1||item.whether_external==0?this.config.isrun[item.whether_external]:"")+"'>" 
             + (item.whether_external==1||item.whether_external==0?this.config.isrun[item.whether_external]:"")
             + "</td><td><a class='operation' data-id='" + item.id
             + "' data-name='" + item.name 
             + "' data-phone='" + item.phone
             + "' data-address='" + item.address 
             + "' data-sex='" + item.sex
             + "' data-birthday='" + birthday
             + "' data-education='" + item.education
             + "' data-license_number='" + item.license_number
             + "' data-depid='" + item.depid
             + "' data-driving_skill_level='" + item.driving_skill_level
             + "' data-driving_license_type='" + item.driving_license_type
             + "' data-driving_file_code='" + item.driving_file_code
             + "' data-issue_date='" + issue_date
             + "' data-transfertodriverdate='" + transfertodriverdate
             + "' data-is_part_time='" + item.is_part_time
             + "' data-whether_external='" + item.whether_external
             + "' data-notes='" + item.notes 
             +"'>查看详细</a></td></tr>";           
        }.bind(this));
        this.domObj.find(".driverlist").empty().append(html_trs_data);   
        
        //查看详细
        this.domObj.find(".operation").off("click").on("click", function (e) { 
            this.select_info.currentTarget=$(e.currentTarget);   
            this.editlabel="detail";                      
            this.showInfo($(e.currentTarget),"查看详细");
        }.bind(that)); 

        //勾选
        this.domObj.find('.select_driver_list').off("change").on("change",function(e){  
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
        }.bind(that));    
    }   

    /**
     * @function 显示当前数据，可编辑，添加
     * @param target 对象
     */
    showInfo(target,tit){
        this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
        var Obj =(this.editlabel!="detail"? this.popup.Show(tit, this.template.split('$$')[1]):this.popup.Show(tit, this.template.split('$$')[2],true));              
        this.currentPopup=Obj;
        var upload,id="";
        this.getUser();
        if(target!=null){
            id=target.data("id");
            Obj.conObj.find('.driver_name').val(target.data("name"));
            Obj.conObj.find('.phone').val(target.data("phone"));
            Obj.conObj.find('.address').val(target.data("address"));
            Obj.conObj.find('.birthday').val(target.data("birthday"));
            Obj.conObj.find('.license_number').val(target.data("license_number"));
            Obj.conObj.find('.driving_file_code').val(target.data("driving_file_code"));
            Obj.conObj.find('.issue_date').val(target.data("issue_date"));
            Obj.conObj.find('.transfertodriverdate').val(target.data("transfertodriverdate"));
            Obj.conObj.find('.notes').val(target.data("notes"));            
        }
        this.initDicControl();
        this.initTimeControl();
       
        (<any>$('#widget-VehicleDriverBaseInfoManagement_addpopup')).bootstrapValidator();
        //提交保存
        Obj.submitObj.off("click").on("click", function () {
                var platenumber = Obj.conObj.find('.NAME');                                        
                if (platenumber.val() == '') {
                    platenumber.addClass('has-error');                       
                    this.popup.ShowTip("员工姓名不能为空！");
                    return;
                } 
                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + (this.editlabel=="add"?this.config.addDriver:this.config.updateDriver),
                    data: {
                        "id":id,
                        "name":Obj.conObj.find('.driver_name').val(),
                        "phone":Obj.conObj.find('.phone').val(),
                        "address":Obj.conObj.find('.address').val(),
                        "sex":Obj.conObj.find('.sex option:selected').val(),
                        "birthday":Obj.conObj.find('.birthday').val(),
                        "education":Obj.conObj.find('.education option:selected').val(),
                        "license_number":Obj.conObj.find('.license_number').val(),
                        "depid":Obj.conObj.find('.depid').val(),
                        "driving_skill_level":Obj.conObj.find('.driving_skill_level option:selected').val(),
                        "driving_license_type":Obj.conObj.find('.driving_license_type option:selected').val(),
                        "driving_file_code":Obj.conObj.find('.driving_file_code').val(),
                        "issue_date":Obj.conObj.find('.issue_date').val(),
                        "transfertodriverdate":Obj.conObj.find('.transfertodriverdate').val(),
                        "whether_external":Obj.conObj.find('.whether_external option:selected').val(),
                        "is_part_time":Obj.conObj.find('.is_part_time option:selected').val(),
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
                        this.getDriver(); 
                    }.bind(this),
                    error: function (data) {
                         this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)
                });                            
        }.bind(this));                             
    }

    /**----------------------------字典获取------------------------- */
    /**
     * @function 部门列表
     * @param isall 是否显示全部
     * @param obj 对象
     */
    getInitGroup(isall,obj) {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
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
                var strdepartment = "";
                if(isall==true){
                    strdepartment="<option value=''>全部</option>"
                }
                $.each(results.result.rows, function (index, item) {
                    strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
                }.bind(this));
                obj.empty().append(strdepartment);
                this.getDriver();               
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }

    /**
     * @function 获取部门列表
     */
    getGroup() {
        $.ajax({
            headers:this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid":this.companyid
            },
            success: this.getGroupListCallback.bind(this),
            error: function (data) {
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getGroupListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strdepartment = (this.editlabel=='detail'?"<option value=''></option>":"<option value=''>--请选择--</option>");
        $.each(results.result.rows, function (index, item) {
             if(this.select_info.currentTarget!=null && this.select_info.currentTarget.data("depid")==item.id && (this.editlabel=="edit"||this.editlabel=="detail")){//编辑状态
                strdepartment += "<option selected='selected' value='" + item.id + "'>" + item.name + "</option>";
            }else{
                strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
            }
        }.bind(this));
        this.currentPopup.conObj.find(".depid").empty().append(strdepartment);
    }

    /**
     * @function 根据部门id获取用户列表，空代表查询全部
     */
    getUser() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid":this.companyid
            },
            success: this.getUserListCallback.bind(this),
            error: function (data) {
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getUserListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strusers = "";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option>" + item.username + "</option>";
        }.bind(this));
        this.currentPopup.conObj.find(".driver_name_list").empty().append(strusers);
    }   

    /**
     * @function 司机信息其他字典表加载
     * @param key 字典关键字
     * @param isnull 是否为必选，false必选、true非必选
     */
    getDicOther(key,isnull){
        var datas=this.config.dictables[key].datas;
        var values=this.config.dictables[key].value;
        var optstr=(this.editlabel=='detail'?"<option value=''></option>":"<option value=''>--请选择--</option>");
        if(isnull==false){
            optstr="";
        }
        for(var i=0;i<datas.length;i++){
            var name=datas[i];  
            var value=values[i];         
            if(this.select_info.currentTarget!=null && this.select_info.currentTarget.data(key)==value && (this.editlabel=="edit"||this.editlabel=="detail")){//编辑状态
                optstr += "<option selected='selected' value='" + value + "'>" + name + "</option>";
            }else{
                optstr += "<option value='" + value + "'>" + name + "</option>";
            } 
            this.currentPopup.conObj.find('.'+key).empty().append(optstr);
        }                
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