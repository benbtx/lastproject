import BaseWidget = require('core/BaseWidget.class');
export = XJBuildingSiteCheck;

class XJBuildingSiteCheck extends BaseWidget {
    baseClass = "widget-XJBuildingSiteCheck";


    popup;//
    photowall;
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数


    startup() {
        this.initHtml();

    }

    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.XJBuildingSiteCheckInit();

    }
    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }

    XJBuildingSiteCheckInit() {
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.popup = this.AppX.runtimeConfig.popup;
        this.pageIndex = this.config.requestCheckBuildSiteInfo.Count_pageindex;
        this.pageSize = this.config.requestCheckBuildSiteInfo.Count_pagesize;
        this.eventInit();
        this.requestCheckBuildSiteInfo(this.initCheckBuildSiteList.bind(this));

    }

    //初始化相关事件
    eventInit() {

        //上一页请求事件
        $(".widget-XJBuildingSiteCheck .div-pagetool button.pre").bind("click", this.prePage.bind(this));
        //下一页请求事件
        $(".widget-XJBuildingSiteCheck .div-pagetool button.next").bind("click", this.nextPage.bind(this));
        //跳转请求事件
        $(".widget-XJBuildingSiteCheck .div-pagetool button.pageturning").bind("click", this.goPage.bind(this));

    }

    //上一页
    prePage() {
        var pageIndex = parseInt($(".widget-XJBuildingSiteCheck .div-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            this.requestCheckBuildSiteInfo(this.initCheckBuildSiteList.bind(this));
        }
    }

    //下一页
    nextPage() {
        var pageIndex = parseInt($(".widget-XJBuildingSiteCheck .div-pagetool button.current span.currentpage").text());
        var totalPage = parseInt($(".widget-XJBuildingSiteCheck .div-pagetool button.current span.totalpage").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.pageIndex = nextPage;
            this.requestCheckBuildSiteInfo(this.initCheckBuildSiteList.bind(this));
        }
    }

    //跳转到另外一页
    goPage() {
        var pageIndex = parseInt($(".widget-XJBuildingSiteCheck .div-pagetool div.go input.currpage").val());
        var totalPage = parseInt($(".widget-XJBuildingSiteCheck .div-pagetool button.current span.totalpage").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.pageIndex = goPage;
            this.requestCheckBuildSiteInfo(this.initCheckBuildSiteList.bind(this));
        }
    }

    //请求需审核的工地信息
    requestCheckBuildSiteInfo(callback) {
        var config = this.config.requestCheckBuildSiteInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": this.pageIndex,
                "pagesize": this.pageSize
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(result.result);
                }
            },
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化工地类型列表
    initCheckBuildSiteList(result) {
        var rows = result.rows;
        //清除之前的列表项  
        $(".widget-XJBuildingSiteCheck  .buildsitecontent tbody tr").remove();
        var template = $(".widget-XJBuildingSiteCheck .buildsitecontent tbody #checkbuildsitetemplate").text().trim();
        var html = "";
        var data = [];
        for (var i = 0, length = rows.length; i < length; i++) {
            var id = rows[i].id;
            var name = rows[i].name;//监护名称
            var buildManager = rows[i].build_username;//监护人员
            var constructionDepartment = rows[i].company_name;//施工单位
            var constructionType = rows[i].project_type_name;//施工类型
            var address = rows[i].address;//施工地点
            var constructionManager = rows[i].scene_charege_name;//施工负责人
            var constructionManagerTelphone = rows[i].charege_phone;//施工负责人
            var surperiorDepartment = rows[i].charge_company_name;//主管单位
            var surperiorManager = rows[i].charege_username;//主管人
            var reportPerson = rows[i].handle_username;//回报人
            var oraginalState = rows[i].state;//工地之前状态
            var fileSrc = "";
            var fileNotes = "";
            var files = rows[i].file;
            if (files !== undefined && files.length != 0) {
                // var len= files.split(",").length;
                // for (var j = 0, filelength =len; j < filelength; j++) {
                //     fileSrc = fileSrc + files[j].filename + ",";
                //     fileNotes = fileNotes + files[j].filenote + ",";
                // }
                fileSrc = files;
            }
            if (oraginalState === 0) {
                oraginalState = "未施工";
            } else if (oraginalState === 1) {
                oraginalState = "施工中";
            } else if (oraginalState === 2) {
                oraginalState = "施工完成";
            }
            var changeState = rows[i].project_state;//需变更状态
            if (changeState === 0) {
                changeState = "未施工";
            } else if (changeState === 1) {
                changeState = "施工中";
            } else if (changeState === 2) {
                changeState = "施工完成";
            }


            data = [id, i + 1, name, buildManager, constructionDepartment, constructionType, address, constructionManager, constructionManagerTelphone, surperiorDepartment, surperiorManager, reportPerson, oraginalState, changeState, fileSrc, fileNotes];
            var index = 0;
            var templateRepalce = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : '';
            });
            html += templateRepalce;
        }
        $(".widget-XJBuildingSiteCheck  .buildsitecontent tbody").append(html);

        var total = result.total;//总记录数
        var pageSize = result.pagesize || this.pageSize;//每页显示几条
        var pageIndex = result.pageindex || this.pageIndex;//第几页
        var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
        $(".widget-XJBuildingSiteCheck  .buildsitecontent .pagecontrol .total").text(total);
        $(".widget-XJBuildingSiteCheck  .buildsitecontent .pagecontrol .pagesize").text(pageSize);
        $(".widget-XJBuildingSiteCheck  .buildsitecontent  span.totalpage").text(totalPage);
        $(".widget-XJBuildingSiteCheck  .buildsitecontent  span.currentpage").text(pageIndex);
        // 工地审核附件查看事件
        $(".widget-XJBuildingSiteCheck  #maincontent tbody tr button.view").bind("click", this.vieReportFile.bind(this));
        // 工地状态变更审核
        $(".widget-XJBuildingSiteCheck  #maincontent tbody tr button.check").bind("click", this.checkBuildSite.bind(this));
    }

    // selecteItem(event) {
    //     var state = $(event.currentTarget).attr("choosed");
    //     if (state === "no") {
    //         $(event.currentTarget).addClass("success");
    //         $(event.currentTarget).attr("choosed", "yes");
    //         $(event.currentTarget).find("td input").prop("checked", true);
    //     } else {
    //         $(event.currentTarget).removeClass("success");
    //         $(event.currentTarget).attr("choosed", "no");
    //         $(event.currentTarget).find("td input").prop("checked", false);
    //     }


    // }

    //查看申请工地审核上传的文件
    vieReportFile(event) {
        $(".widget-XJBuildingSiteCheck  #maincontent tbody tr ").removeClass("success");
        $(event.currentTarget).parents("tr").addClass("success");
        $(event.currentTarget).children();
        var data = [];
        var fileSrcs = $(event.currentTarget).attr("filesrc").split(",");
        var fileNotes = $(event.currentTarget).attr("filenotes").split(",");
        for (var i = 0, length = fileSrcs.length; i < length; i++) {
            if (fileSrcs[i] !== "") {
                data.push({ src: AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + fileSrcs[i], alt: fileNotes[i] });
            }

        }
        this.photowall.setSize(600, 650);
        var htmlString = _.template(this.template.split('$$')[2])({ photoData: data });
        var Obj = this.photowall.Show("照片", htmlString);
    }

    //审核
    checkBuildSite(event) {
        $(".widget-XJBuildingSiteCheck  #maincontent tbody tr ").removeClass("success");
        $(event.currentTarget).parents("tr").addClass("success");
        this.popup.setSize(600, 350);
        var Obj = this.popup.Show("审核工地状态更改", this.template.split('$$')[1]);
        var config = this.config.checkBuildSite;
        var toast = this.AppX.runtimeConfig.toast;
        var buildSiteId = $(event.currentTarget).parents("tr").attr("checkid");
        Obj.submitObj.off("click").on("click", function () {
            var checkState = Obj.conObj.find('.checkstate input:checked').val();
            var notes = Obj.conObj.find('textarea.checknotes').val();
            //发送审核请求
            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
                data: {
                    "id": buildSiteId,
                    "check_state": checkState,
                    "check_note": notes
                },
                success: function (result) {
                    if (result.code !== 1) {
                        toast.Show(config.MSG_error);
                    } else {
                        toast.Show(config.MSG_success);
                        this.requestCheckBuildSiteInfo(this.initCheckBuildSiteList.bind(this));
                    }
                }.bind(this),
                error: function () {
                    toast.Show(config.MSG_error);
                },
                dataType: "json",
            });
        }.bind(this));
    }





}