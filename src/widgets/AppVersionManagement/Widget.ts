import BaseWidget = require('core/BaseWidget.class');
export = AppVersionManagement;

class AppVersionManagement extends BaseWidget {
    baseClass = "widget-appversionmanagement";

    toast = null;
    popup = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;



    id = "";
    version = "";
    version_sub = "";
    publishtime = "";
    notes = "";

    keyword = "";




    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();

        this.setHtml(html);
        this.ready();

        this.getAppVersion(this.config.pagenumber);
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        //获取设备信息
    }





    getAppVersionListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询设备信息出错！");
            console.log(results.message);
            return;
        }
        if (results.result.total % this.config.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;

        }

        //为分页控件添加信息

        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条记录，每页默认显示" + that.currentpagesieze + "条记录");
        this.domObj.find(".content").text("第" + that.currentpage + "页共" + that.totalpage + "页");
        if (that.totalpage == 0) {
            // this.domObj.find(".content").text("无数据");
            this.domObj.find(".pagecontrol").text("总共-条记录，每页默认显示" + that.currentpagesieze + "条记录");
            this.domObj.find(".content").text("第-页共-页");
        }



        //生成table ,并给分页控件赋值事件

        // this.currentpage = results.result.pageindex;
        //动态生成书签及分页控件
        var domtb = this.domObj.find(".addappversion");
        domtb.empty();
        var address;
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {

            html_trs_data += "<tr class=goto  data-id='" + item.id + "' data-filename='" + item.filename + "' data-filetype='" + item.filetype + "' data-notes='" + item.notes + "' data-publishtime='" + item.publishtime + "'><td>" + item.version + "</td><td>" + item.publishtime + "</td><td>" + item.filename + "</td><td><a class='operation' data-id='" + item.id + "' data-filename='" + item.filename + "' data-filetype='" + item.filetype + "' data-notes='" + item.notes + "' data-publishtime='" + item.publishtime + "'>说明</a></td></tr>";
            //刷新infowindow
            // this.setContent(item);
        }.bind(this));
        domtb.append(html_trs_data);


        var html_trs_blank = "";
        if (results.result.rows.length < that.config.pagesize) {
            var num = that.config.pagesize - results.result.rows.length;
            for (var i = 0; i < num; i++) {
                html_trs_blank += "<tr class=goto><td></td><td></td><td></td><td></td></tr>";
            }
            domtb.append(html_trs_blank);
        }




        //申明操作事件
        // var that=this;
        this.domObj.find(".operation").off("click").on("click", function (e) {

            var j = 0;
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.curhiddendangerid = $(e.currentTarget).data("id");

            }
            this.popup.setSize(600, 450);

            var Obj = this.popup.Show("版本说明", this.template.split('$$')[5]);
            //赋值
            Obj.conObj.find('.notes').val($(e.currentTarget).data("notes"));

            Obj.submitObj.off("click").on("click", function () {

                this.popup.Close();

            }.bind(this));



        }.bind(this));




    }


    initEvent() {

        var that = this;
        this.domObj.find('.btn_search').on("click", function () {

            this.keyword = this.domObj.find('.search_condition').val();

            this.getAppVersion(this.config.pagenumber);



        }.bind(this));


        this.domObj.find('.search_condition').keydown(function (event) {
            if (event.keyCode == 13) {//enter
                this.keyword = this.domObj.find('.search_condition').val();
                this.getAppVersion(this.config.pagenumber);
            }
        }.bind(this));


        //重置查询
        this.domObj.find('.btn_rsearch').on("click", function () {

            this.keyword = "";
            this.domObj.find('.search_condition').val("");
            this.getAppVersion(this.config.pagenumber);
        }.bind(this));

        this.domObj.find('.btn_add').on("click", function () {

            //弹出popup
            this.popup.setSize(600, 520);
            var Obj = this.popup.Show("新增", this.template.split('$$')[1]);

            this.initFileUploadPlugin(Obj);
            Obj.submitObj.off("click").on("click", function () {


                var appfile = Obj.conObj.find('.appfile');

                var notes = Obj.conObj.find('.notes');


                if (appfile.val() == '') {
                    appfile.addClass('has-error');
                    appfile.attr("placeholder", "不能为空！");
                    this.toast.Show("App文件不能为空！");
                    return;
                }
                if (notes.val() == '') {
                    notes.addClass('has-error');
                    notes.attr("placeholder", "不能为空！");
                    this.toast.Show("版本说明信息不能为空！");
                    return;
                }



                if ((<any>$('.appfile')[0]).files.length == 0) {

                    this.toast.Show("请选择一个app，进行上传！");
                    return;
                }

                if ((<any>$('.notes')[0]).files.length == 0) {

                    this.toast.Show("请选择版本说明，进行上传！");
                    return;
                }

                var appfile = (<any>$('.appfile')[0]).files[0];
                var notes = (<any>$('.notes')[0]).files[0];
                var formData = new FormData();
                formData.append('file', appfile);
                formData.append('version', appfile.name.substring(0, appfile.name.lastIndexOf(".")));
                // formData.append('notes', notes.val());

                var reader = new FileReader();

                var content;
                content = reader.readAsText(notes, "UTF-8");

                reader.onload = function (event) {
                    content = event.target.result;
                    //alert(content);
                    formData.append('notes', content);
                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        // url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addAppVersion,
                        url: this.config.xjapiroot.replace(/\/+$/, "") + this.config.addAppVersion,
                        contentType: false,
                        processData: false,
                        cache: false,
                        // data: {
                        //     "os": os.val(),
                        //     "version": version.val(),
                        //     "version_sub": version_sub.val(),
                        //     "publishtime": publishtime.val(),
                        //     "note": note.val(),
                        // },
                        data: formData,
                        success: this.addAppVersionCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                        // jsonp:"callback"
                    });


                }.bind(this);
                reader.onerror = function (event) {
                    alert('error')
                    //alert("File could not be read! Code " + event.target.error.code);
                };






            }.bind(this));



        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {

            if (this.padid == "") {
                this.toast.Show("请选择一个设备！");
                return;
            }
            //弹出popup
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            Obj.conObj.find('.uim').val(this.uim);
            Obj.conObj.find('.imei').val(this.imei);
            Obj.conObj.find('.mobile').val(this.mobile);
            Obj.conObj.find('.padname').val(this.padname);
            Obj.conObj.find('.brand').val(this.brand);
            Obj.conObj.find('.model').val(this.model);
            Obj.conObj.find('.note').val(this.note);
            Obj.conObj.find('.buydate').val(this.buydate);
            Obj.conObj.find('.appos').val(this.appos);
            Obj.conObj.find('.appversion').val(this.appversion);
            Obj.conObj.find('.appversion_releasetime').val(this.appversion_releasetime);
            Obj.conObj.find('.appversion_updatetime').val(this.appversion_updatetime);
            Obj.conObj.find('.state').val(this.state);
            Obj.conObj.find('.companyid').val(this.companyid);


            Obj.submitObj.off("click").on("click", function () {

                var uim = Obj.conObj.find(".uim");
                var imei = Obj.conObj.find('.imei');
                var userid = Obj.conObj.find('.userid');
                var pdaid = Obj.conObj.find('.pdaid');
                var mobile = Obj.conObj.find('.mobile');
                var padname = Obj.conObj.find('.padname');
                var brand = Obj.conObj.find('.brand');
                var model = Obj.conObj.find('.model');
                var note = Obj.conObj.find('.note');
                var buydate = Obj.conObj.find('.buydate');
                var appos = Obj.conObj.find('.appos');
                var appos = Obj.conObj.find('.appos');
                var appversion = Obj.conObj.find('.appversion');
                var appversion_releasetime = Obj.conObj.find('.appversion_releasetime');
                var appversion_updatetime = Obj.conObj.find('.appversion_updatetime');
                var state = Obj.conObj.find('.state');
                var companyid = Obj.conObj.find('.companyid');
                if (uim.val() == '') {
                    uim.addClass('has-error');
                    uim.attr("placeholder", "不能为空！");
                    // this.toast.Show("设备名称不能为空！");
                    return;
                }
                if (imei.val() == '') {
                    imei.addClass('has-error');
                    imei.attr("placeholder", "不能为空！");
                    this.toast.Show("设备登录账号不能为空！");
                    return;
                }
                if (model.val() == '') {
                    model.addClass('has-error');
                    model.attr("placeholder", "不能为空！");
                    this.toast.Show("设备型号不能为空！");
                    return;
                }
                if (padname.val() == '') {
                    padname.addClass('has-error');
                    padname.attr("placeholder", "不能为空！");
                    this.toast.Show("设备名称不能为空！");
                    return;
                }

                $.ajax({
                    headers: {
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateAppVersion,
                    data: {
                        "padid": this.padid,
                        "uim": uim.val(),
                        "imei": imei.val(),
                        "padname": padname.val(),
                        "brand": brand.val(),
                        "model": model.val(),
                        "note": note.val(),
                        "buydate": buydate.val(),
                        "appos": appos.val(),
                        "appversion": appversion.val(),
                        "appversion_releasetime": appversion_releasetime.val(),
                        "appversion_updatetime": appversion_updatetime.val(),
                        "state": state.val(),
                        "companyid": AppX.appConfig.departmentid,
                        // f: "pjson"
                    },
                    success: this.updateAppVersionCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });
            }.bind(this));







        }.bind(this));


        this.domObj.find('.btn_delete').on("click", function () {

            if (this.id == "") {
                this.toast.Show("请选择一个设备！");
                return;
            }
            this.popup.setSize(600, 150);

            var Obj = this.popup.Show("删除", this.template.split('$$')[4]);
            //赋值


            Obj.submitObj.off("click").on("click", function () {

                $.ajax({
                    headers: {
                        // 'Authorization-Token': AppX.appConfig.xjxj
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteAppVersion + this.id,
                    data: {
                        "id": this.id,
                        // f: "pjson"
                    },
                    success: this.deleteAppVersionCallback.bind(this),
                    error: function (data) {
                        this.toast.Show("服务端ajax出错，获取数据失败!");
                    }.bind(this),
                    dataType: "json",
                });

            }.bind(this));




        }.bind(this));


        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.id = $(e.currentTarget).data("id");
                // this.uim = $(e.currentTarget).data("uim");
                // this.imei = $(e.currentTarget).data("imei");
                // this.mobile = $(e.currentTarget).data("mobile");
                // this.padname = $(e.currentTarget).data("padname");
                // this.brand = $(e.currentTarget).data("brand");
                // this.model = $(e.currentTarget).data("model");
                // this.note = $(e.currentTarget).data("note");





            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });



        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {

            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.id = $(e.currentTarget).data("id");
                // this.uim = $(e.currentTarget).data("uim");
                // this.imei = $(e.currentTarget).data("imei");
                // this.mobile = $(e.currentTarget).data("mobile");
                // this.padname = $(e.currentTarget).data("padname");
                // this.brand = $(e.currentTarget).data("brand");
                // this.model = $(e.currentTarget).data("model");
                // this.note = $(e.currentTarget).data("note");

            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');





        });
        //动态生成书签及分页控件
        //分页控件fykj 向前、向后事件

        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.currentpage - 1 > 0) {
                this.currentpage = this.currentpage - 1;
                this.getAppVersion(this.currentpage);
            }

        }.bind(this));
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.currentpage + 1 <= this.totalpage) {
                this.currentpage = this.currentpage + 1;
                this.getAppVersion(this.currentpage);
            }
        }.bind(this));


        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.totalpage && currpage >= 1) {
                this.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getAppVersion(this.currentpage);
            }
        }.bind(this));


    }


    //初始化上传文件插件
    initFileUploadPlugin(Obj) {
        (<any>Obj.conObj.find(".appfile")).fileinput({
            'language': 'zh',
            'showCaption': true,
            'showPreview ': false,
            'showRemove': false,
            'showUpload': false,
            'previewClass ': {
                height: "100px"
            },
            'initialPreviewCount': 2,
            'initialPreviewConfig': [{
                width: '50px'
            }],
            'maxFilesNum': 1,//上传最大的文件数量
            "allowedFileExtensions": ['apk'],//接收的文件后缀
            'previewFileType': 'image',
            'dropZoneEnabled': true,//是否显示拖拽区域
            'previewSettings': {
                image: { width: "50px", height: "50px" },
            },
        });

        (<any>Obj.conObj.find(".notes")).fileinput({
            'language': 'zh',
            'showCaption': true,
            'showPreview ': true,
            'showRemove': false,
            'showUpload': false,
            'previewClass ': {
                height: "50px"
            },
            'initialPreviewCount': 2,
            'initialPreviewConfig': [{
                width: '50px'
            }],
            'maxFilesNum': 1,//上传最大的文件数量
            "allowedFileExtensions": ['txt', 'MD'],//接收的文件后缀
            'previewFileType': 'txt',
            'dropZoneEnabled': true,//是否显示拖拽区域
            'previewSettings': {
                txt: { width: "50px", height: "50px" },
            },



        });
    }

    getAppVersion(pagenumber) {
        this.currentpage = pagenumber || this.config.pagenumber;
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getAppVersionList,
            data: {
                "pageindex": pagenumber || this.config.pagenumber,
                "pagesize": this.config.pagesize,
                "keyword": this.keyword,
                // "search_type": 1,
                // f: "pjson"
            },
            success: this.getAppVersionListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    addAppVersionCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getAppVersion(this.config.pagenumber);

        //清空：选中、新增时产生的选中，避免直接点删除
        this.id = "";

    }

    updateAppVersionCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getAppVersion(this.config.pagenumber);

        //清空修改时产生的选中，避免直接点删除
        this.id = "";

    }


    deleteAppVersionCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);
        //重新查询
        this.getAppVersion(this.config.pagenumber);

        //清空数据
        this.id = "";

    }





    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}