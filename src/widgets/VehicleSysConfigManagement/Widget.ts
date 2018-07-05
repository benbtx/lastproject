import BaseWidget = require('core/BaseWidget.class');
export = VehicleSysConfigManagement;
class VehicleSysConfigManagement extends BaseWidget {
    baseClass = "widget-VehicleSysConfigManagement";
    toast = null;
    popup = null;
    loadWait=null;

    select_info={
        datas:[],
        ids:[],
        id:"",
        value:"",
        notes:"",
        childkey:""
    };
    typeDatas=new Object();
    keyword="";

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
    }

    /**
     * @function 事件初始化
     */
    initEvent() {
        this.getSysConfigs();
        var that=this; 
        //查询 click
        this.domObj.find('.btn_search').on("click", function () { 
            this.config.currentpage=1;
            this.getVehicleSysConfig();
        }.bind(this));

        //刷新 click
        this.domObj.find('.btn_refresh').on("click", function () {
            this.config.currentpage=1;          
            this.getVehicleSysConfig();
        }.bind(this));

        //添加 click 弹框方式
        this.domObj.find('.btn_add').on("click", function () {
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);
            (<any>$('#widget-VehicleSysConfigmanagement_addpopup')).bootstrapValidator();          
            Obj.submitObj.off("click").on("click", function () {
                var cartypename = Obj.conObj.find('.car_type_name');
                var note = Obj.conObj.find('.notes').val(); 
                var key=this.domObj.find(".sysconfigs option:selected").val();
                var parentable=this.domObj.find(".parentable option:selected").val();                    
                if (cartypename.val() == '') {
                    cartypename.addClass('has-error');                       
                    this.popup.ShowTip("类型名称不能为空！");
                    return;
                } 
               (<any>$('#widget-VehicleSysConfigmanagement_addpopup')).bootstrapValidator();
                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addVehicleSysConfig,
                    data:{
                        "key":key,
                        "value":cartypename.val(),
                        "notes":note//,
                        //"parentable":parentable
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.popup.ShowTip(results.message);
                            return;
                        }   
                        this.popup.Close();                    
                        this.toast.Show(this.config.messages.add);
                        this.config.currentpage=1;
                        this.getVehicleSysConfig();
                    }.bind(this),
                    error: function (data) {
                        this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)                    
                });

            }.bind(this));

            //同类中命名不能重名
            Obj.conObj.find('.car_type_name').off('blur').on('blur',function(e){
                if($(e.currentTarget).val()==""){
                    return;
                }
                var key=this.domObj.find(".sysconfigs option:selected").val();                               
                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleSysConfigList,
                    data:{
                         "pageindex":1,
                         "pagesize": this.config.pagesize,
                         "key":key,
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

       
        //更新 click
        this.domObj.find('.btn_edit').on("click", function () {
            var that=this;
            if (this.select_info.id == "") {
                this.toast.Show("请选择一个类型！");
                return;
            }
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("更新", this.template.split('$$')[1]); 
            Obj.conObj.find('.car_type_name').val(this.select_info.value); 
            Obj.conObj.find('.notes').val(this.select_info.notes);              
            (<any>$('#widget-VehicleSysConfigmanagement_addpopup')).bootstrapValidator();
            Obj.submitObj.off("click").on("click", function () {
                var cartypename = Obj.conObj.find('.car_type_name');
                var note = Obj.conObj.find('.notes').val();  
                var key=this.domObj.find(".sysconfigs option:selected").val();                         
                if (cartypename.val() == '') {
                    cartypename.addClass('has-error');                       
                    this.popup.ShowTip("类型名称不能为空！");
                    return;
                } 

                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateVehicleSysConfig,
                    data:{
                        "id":this.select_info.id,
                        "value":cartypename.val(),
                        "notes":note//,
                        //"childkey":this.select_info.childkey
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.popup.ShowTip(results.message);
                            return;
                        }   
                        this.popup.Close();                    
                        this.toast.Show(this.config.messages.update);
                        this.config.currentpage=1;
                        this.getVehicleSysConfig();
                    }.bind(this),
                    error: function (data) {
                        this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)                    
                });

            }.bind(this));

            //同类中命名不能重名
            Obj.conObj.find('.car_type_name').off('blur').on('blur',function(e){ 
                var key=this.domObj.find(".sysconfigs option:selected").val();               
                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleSysConfigList,
                    data:{
                         "pageindex":1,
                         "pagesize": this.config.pagesize,
                         "key":key,
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
          
        //类型绑定 click
        this.domObj.find('.btn_bind').on("click", function () {
            var that=this;
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("类型绑定", this.template.split('$$')[2]); 
            Obj.conObj.find('.car_type_name').val(this.domObj.find(".sysconfigs option:selected").text()); 
            this.getVehicleSysConfigs(Obj.conObj);            
            (<any>$('#widget-VehicleSysConfigmanagement_addpopup')).bootstrapValidator();
            Obj.submitObj.off("click").on("click", function () { 
                var key=this.domObj.find(".sysconfigs option:selected").val();                         
                var item=this.typeDatas[Obj.conObj.find(".sysconfigs option:selected").val()];

                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateVehicleSysConfig,
                    data:{
                        "id":item.id,
                        "key":item.key,
                        "value":key,
                        "notes":item.notes
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.popup.ShowTip(results.message);
                            return;
                        }   
                        this.popup.Close();                    
                        this.toast.Show("类型绑定成功！");
                        this.config.currentpage=1;
                        this.getVehicleSysConfig();
                    }.bind(this),
                    error: function (data) {
                        this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)                    
                });

            }.bind(this));

            //同类中命名不能重名
            Obj.conObj.find('.car_type_name').off('blur').on('blur',function(e){ 
                var key=this.domObj.find(".sysconfigs option:selected").val();               
                $.ajax({
                    headers: {                        
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid
                    },
                    type: "POST",
                    dataType: "json",                    
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleSysConfigList,
                    data:{
                         "pageindex":1,
                         "pagesize": this.config.pagesize,
                         "key":key,
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteVehicleSysConfig,
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
                        this.getVehicleSysConfig();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.other);
                    }.bind(this)                    
                });

            }.bind(this));            
        }.bind(this));

        //选中行高亮 click
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.select_info.id = $(e.currentTarget).data("id");
                this.select_info.value = $(e.currentTarget).data("value");               
                this.select_info.notes = $(e.currentTarget).data("notes");    
                this.select_info.childkey=  $(e.currentTarget).data("childkey")                                                 
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        });
       
        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.currentpage - 1 > 0) {
                this.config.currentpage = this.config.currentpage - 1;
                this.getVehicleSysConfig();
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.getVehicleSysConfig();
            }
        }.bind(this));

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.pagenumber && currpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getVehicleSysConfig();
            }
        }.bind(this));

        //页面条数控件
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getVehicleSysConfig();
        }.bind(this));

        //全选
        this.domObj.find('.selectalllist').off("change").on("change", function () {
            if (this.domObj.find(".selectalllist").prop('checked') == true) {
                this.domObj.find(".select_type_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
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
    getVehicleSysConfig() {
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            value:"",
            notes:"",
            childkey:""
        };
        this.domObj.find('.selectalllist').prop("checked",false);
        var key=this.domObj.find(".sysconfigs option:selected").val();
        $.ajax({
            headers: {               
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid
            },
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleSysConfigList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize": this.config.pagesize,
                "key":key
            },
            success: this.getVehicleSysConfigListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getVehicleSysConfigListCallback(results) {
        console.log(results);
        this.loadWait.Hide();
        var that = this; 
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        if (results.result.rows.length % this.config.pagesize == 0) {
            this.config.pagenumber = Math.floor(parseInt(results.result.rows.length) / parseInt(this.config.pagesize));
        } else {
            this.config.pagenumber = Math.floor(parseInt(results.result.rows.length) / parseInt(this.config.pagesize)) + 1;
        }

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.rows.length + "条，每页");
        this.domObj.find(".content").text("第" + this.config.currentpage + "页共" + this.config.pagenumber + "页");
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
        if (this.config.pagenumber == 0) {
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
                        + "' data-childkey='" + item.childkey                      
                        + "'><td class='checkwidth'><input type='checkbox' name='select_type_list' class='select_type_list' data-id='" 
                        + item.id
                        + "' data-value='" + item.value            
                        + "' data-notes='" + item.notes
                        //+ "' data-childkey='" + item.childkey
                        +"'/></td><td class='checkwidth2'>"+ (i+1)
                        +"</td><td title='"+item.value+"'>"+ item.value 
                        +"</td><td title='"+item.notes+"'>"+ item.notes 
                        + "</td><td title='"+item.create_time+"'>"+ item.create_time 
                        + "</td></tr>";           
        }.bind(this));
        this.domObj.find(".VehicleSysConfiglist").empty().append(html_trs_data);
        
        //勾选
        this.domObj.find('.select_type_list').off("change").on("change",function(e){  
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
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
     * @function 获取管理配置类型列表
     */
    getSysConfigs() {
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);       
        $.ajax({
            headers: {               
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid
            },
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getConfigList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "keys":this.config.keys
            },
            success: function(results){
                console.log(results);
                var str="";
                var rows=results.result.rows;
                for(var i=0;i<rows.length;i++){
                    str+="<option value='"+rows[i].configkey+"'>"+rows[i].value+"</option>";
                }
                this.domObj.find(".sysconfigs").empty().append(str);
                this.loadWait.Hide();
                this.getVehicleSysConfig();
                this.domObj.find(".sysconfigs").off("change").on("change",function(e){
                    this.getVehicleSysConfig();
                }.bind(this))
            }.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
   

     /**
     * @function 获取类型列表
     */
    getVehicleSysConfigs(conObj) {       
        var key=this.domObj.find(".sysconfigs option:selected").val();
        var keys=[];
        for(var i=0;i<this.config.keys.length;i++){
            if(key!=this.config.keys[i]){
                keys.push(this.config.keys[i]);
            }
        }
        this.typeDatas=new Object();
        $.ajax({
            headers: {               
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid
            },
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleSysConfigList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "keys":keys
                //"parentable":1
            },
            success: function(results){
                 if (results.code != 1) {
                    this.popup.ShowTip(results.message);
                    return;
                }   
                var str="";
                var rows=results.result.rows;
                for(var i=0;i<rows.length;i++){
                    this.typeDatas[rows[i].id]=rows[i];
                    if(rows[i].childkey==key){
                        str+="<option selected='true' value='"+rows[i].id+"'>"+rows[i].value+"</option>"
                    }else{
                        str+="<option value='"+rows[i].id+"'>"+rows[i].value+"</option>";
                    }                    
                }
                conObj.find(".sysconfigs").empty().append(str);
            }.bind(this),
            error: function (data) {
                this.popup.ShowTip(this.config.messages.other);
            }.bind(this)
        });
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