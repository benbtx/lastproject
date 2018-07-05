import BaseWidget = require('core/BaseWidget.class');
export = VehicleTypeManagement;
class VehicleTypeManagement extends BaseWidget {
    baseClass = "widget-VehicleTypeManagement";
    toast = null;
    popup = null;
    loadWait=null;

    select_info={
        datas:[],
        ids:[],
        id:"",
        value:"",
        notes:"",
        icon:""
    };
    keyword="";
    currentnum=0;

    /**
     * @function 页面功能初始化
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
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
        this.getVehicleType();      
    }

    /**
     * @function 事件初始化
     */
    initEvent() {
        var that=this; 
        //查询 click
        this.domObj.find('.btn_search').on("click", function () { 
            this.config.currentpage=1;
            this.getVehicleType();
        }.bind(this));

        //刷新 click
        this.domObj.find('.btn_refresh').on("click", function () {
            this.config.currentpage=1;          
            this.getVehicleType();
        }.bind(this));

        //添加 click 弹框方式
        this.domObj.find('.btn_add').on("click", function () {
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);      
            var upload = ImgUpload('#imgTypeLoad', {num:1,path:"/"});  
            (<any>$('#widget-vehicletypemanagement_addpopup')).bootstrapValidator();          
            Obj.submitObj.off("click").on("click", function () {
                var cartypename = Obj.conObj.find('.car_type_name');
                var note = Obj.conObj.find('.notes').val();                           
                if (cartypename.val() == '') {
                    cartypename.addClass('has-error');                       
                    this.popup.ShowTip("类型名称不能为空！");
                    return;
                } 
                var opt={
                    'datas':[],
                    'url':AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addVehicleType,
                    'Token':AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'success':function(res){
                        var results=JSON.parse(res)
                        if(results.code!=1){
                            this.popup.ShowTip(results.message);
                            return;
                        }
                        this.popup.Close();
                        this.toast.Show(this.config.messages.add);
                        this.getVehicleType();                         
                    }.bind(this),
                    'error':function(res){
                        this.popup.ShowTip(res.message);
                    }.bind(this)
                }  
                opt.datas.push({name:"key",value:this.config.key});     
                opt.datas.push({name:"value",value:cartypename.val()});
                opt.datas.push({name:"notes",value:note});
                upload.uploadImg(opt);

            }.bind(this));                 
        }.bind(this));

       
        //更新 click
        this.domObj.find('.btn_edit').on("click", function () {
            var that=this;
            if (this.select_info.datas.length==0) {
                this.toast.Show("请选择一个类型！");
                return;
            }
            if(this.select_info.datas.length>1){
                this.toast.Show("不能多条信息修改！");
                return;
            }
            var info=this.select_info.datas[0];
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("更新", this.template.split('$$')[1]); 
            var icons=[info.icon];
            if(info.icon==this.config.nodatapic) {
                icons=[];
            }
            var upload = ImgUpload('#imgTypeLoad', {num:1,path:"/",pics:icons});          
            Obj.conObj.find('.car_type_name').val(info.value); 
            Obj.conObj.find('.notes').val(info.notes);              
            (<any>$('#widget-vehicletypemanagement_addpopup')).bootstrapValidator();
            Obj.submitObj.off("click").on("click", function () {
               var cartypename = Obj.conObj.find('.car_type_name');
                var note = Obj.conObj.find('.notes').val();                           
                if (cartypename.val() == '') {
                    cartypename.addClass('has-error');                       
                    this.popup.ShowTip("类型名称不能为空！");
                    return;
                } 
                var opt={
                    'datas':[],
                    'url':AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateVehicleType,
                    'Token':AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'success':function(res){
                        var results=JSON.parse(res)
                        if(results.code!=1){
                            this.popup.ShowTip(results.message);
                            return;
                        }
                        this.popup.Close();
                        this.toast.Show(this.config.messages.update);
                        this.getVehicleType();                         
                    }.bind(this),
                    'error':function(res){
                        var results=JSON.parse(res)
                        this.popup.ShowTip(results.message);
                    }.bind(this)
                }  
                opt.datas.push({name:"key",value:this.config.key});
                opt.datas.push({name:"id",value:info.id});      
                opt.datas.push({name:"value",value:cartypename.val()});
                opt.datas.push({name:"notes",value:note});
                upload.uploadImg(opt);
            }.bind(this));

            
            Obj.conObj.find('.car_type_name').off('blur').on('blur',function(e){
                if($(e.currentTarget).val()==""){
                    return;
                }
                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleTypeList,
                    data:{
                         "pageindex":1,
                         "pagesize": this.config.pagesize,
                         "key":this.config.key,
                         "name":$(e.currentTarget).val()
                    },
                    success: function(results){
                        if(results.result!=null &&results.result.rows.length>0)
                        {
                            for(var i=0;i<results.result.rows.length;i++){
                                if(results.result.rows[i].id !=this.select_info.id){
                                    this.popup.ShowTip("当前命名已被占用，请重新命名!");
                                    return;
                                }
                            }
                             
                        }
                    }.bind(this),
                    error: function (data) {
                        this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)                    
                });
            }.bind(this));
        }.bind(this));
          
        //删除 click
        this.domObj.find('.btn_delete').on("click", function () {
            if (this.select_info.datas.length == 0) {
                this.toast.Show("请选择类型！");
                return;
            }
            this.popup.setSize(this.config.popuptip.width, this.config.popuptip.height);
            var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();                
                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteVehicleType,
                    data:{
                        list:this.select_info.ids
                    },
                    success: function(results){
                        if (results.code != 1) {
                             this.toast.Show(results.message);
                            return;
                        }                      
                        this.toast.Show(this.config.messages.delete);
                        this.config.currentpage=1;
                        this.getVehicleType();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.other);
                    }.bind(this)                    
                });

            }.bind(this));            
        }.bind(this));

        //选中行高亮 click
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            var that=this;
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.select_info.id = $(e.currentTarget).data("id");
                this.select_info.value = $(e.currentTarget).data("value");               
                this.select_info.notes = $(e.currentTarget).data("notes");
                this.select_info.icon=$(e.currentTarget).data("icon");                                                         
            }
            if($(e.currentTarget).hasClass("active")){
                $(e.currentTarget).removeClass('active');
                this.domObj.find(".select_type_list").each(function () { 
                    var id=$(this).data("id");
                    if(id==that.select_info.id)  {
                         $(this).prop('checked', false);
                         that.removeOrAddSelectItem(false,$(this));                         
                    }
                });                
            }else{
                $(e.currentTarget).addClass('active');
                this.domObj.find(".select_type_list").each(function () { 
                    var id=$(this).data("id");
                    if(id==that.select_info.id)  {
                         $(this).prop('checked', true);
                         that.removeOrAddSelectItem(true,$(this));                         
                    }
                });
            }
            if(this.select_info.datas.length==this.currentnum){
                this.domObj.find('.selectalllist').prop('checked',true);
            }else{
                this.domObj.find('.selectalllist').prop('checked',false);
            }
        });
       
        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.currentpage - 1 > 0) {
                this.config.currentpage = this.config.currentpage - 1;
                this.getVehicleType();                
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.getVehicleType();
            }
        }.bind(this));

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.pagenumber && currpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getVehicleType();
            }
        }.bind(this));

        //页面条数控件
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getVehicleType();
        }.bind(this));

        //全选
        this.domObj.find('.selectalllist').off("change").on("change", function () {
            if (this.domObj.find(".selectalllist").prop('checked') == true) {
                this.domObj.find('tr.goto').addClass('active');
                this.domObj.find(".select_type_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
                this.domObj.find('tr.goto').removeClass('active');
                this.domObj.find(".select_type_list").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddSelectItem(false,$(this));                   
                });
            }
        }.bind(that));
    }    

    /**
     * @function 获取类型列表
     */
    getVehicleType() {
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            value:"",
            notes:"",
            icon:""
        };
        this.domObj.find('.selectalllist').prop("checked",false);
        $.ajax({
            headers: {               
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid
            },
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleTypeList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword,
                "key":this.config.key
            },
            success: this.getVehicleTypeListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getVehicleTypeListCallback(results) {
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
        this.currentnum=results.result.rows.length;

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + this.config.currentpage + "页共" + this.config.pagenumber + "页");
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
        if (results.result.total == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页-条");
            this.domObj.find(".content").text("第-页共-页");
            this.domObj.find(".selectpagecontrol").text("，当前选中-条");
        }
        //动态生成书签及分页控件       
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            if(item.icon=="" || item.icon==null){
                item.icon=this.config.nodatapic;
            }else{
                item.icon=AppX.appConfig.xjapipicroot+item.icon;
            }
            html_trs_data += "<tr class=goto  data-id='" + item.id            
                        + "' data-value='" + item.value            
                        + "' data-notes='" + item.notes
                        + "' data-icon='" + item.icon
                        + "'><td class='checkwidth'><input type='checkbox' name='select_type_list' class='select_type_list' data-id='" + item.id
                        + "' data-value='" + item.value            
                        + "' data-notes='" + item.notes
                        + "' data-icon='" + item.icon
                        +"'/></td><td class='checkwidth2'>"+ (i+1)
                        +"</td><td title='"+item.value+"'>"+ item.value 
                        +"</td><td><img class='imgClass' src='"+item.icon+"'/>" 
                        + "</td><td title='"+item.notes+"'>"+ item.notes 
                        + "</td><td title='"+item.create_time+"'>"+ item.create_time 
                        + "</td></tr>";           
        }.bind(this));
        this.domObj.find(".vehicletypelist").empty().append(html_trs_data);
        
        //勾选
        this.domObj.find('.select_type_list').off("change").on("change",function(e){
            var that=this;  
            var checked=e.currentTarget.checked;
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
            this.domObj.find("tr.goto").each(function () {
                var id=$(this).data("id");
                if(id==$(e.currentTarget).data("id")){
                    $(this).removeClass('active');
                    if(checked==true){                        
                        $(this).addClass('active');
                    }
                }                                     
            });
            
            if(this.select_info.datas.length==this.currentnum){
                this.domObj.find('.selectalllist').prop('checked',true);
            }else{
                this.domObj.find('.selectalllist').prop('checked',false);
            }
        }.bind(that));        
    }

    /**
     * @function 添加或删除选中集合
     * @param ischecked 
     * @param currentTarget
     */
    removeOrAddSelectItem(ischecked,currentTarget){
        var item={ 
                "id": currentTarget.data('id'),
                "value":currentTarget.data('value'),
                "notes":currentTarget.data('notes'),
                "icon":currentTarget.data('icon')
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
     * 关闭销毁对象
     */
    destroy() {
        this.select_info=null;
        this.domObj.remove();
        this.afterDestroy();
    }
}