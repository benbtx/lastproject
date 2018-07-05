import BaseWidget = require('core/BaseWidget.class');


declare var Cookies

/*** 暴露类 ***/
export = Header;

class Header extends BaseWidget {
    baseClass = "widget-header";
    toast: any;
    userinfor: any;
    LOGIN_ADDR = window.location.href.replace(/\/+$/, "/login");
    startup() {
        this.toast = this.AppX.runtimeConfig.toast;
        var newTemplate = _.template(this.template)({
            root: this.widgetPath,
            title: AppX.appConfig.title
        });
        this.setHtml(newTemplate, ".body");
        this.ready();
        this.userInfoInitEvent();
        this.loadUserInforData();
    }
    /**
    * (方法说明)从远程查询用户具体信息并显示到界面,不用模板方式，避免界面卡顿
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    loadUserInforData() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/userinfor',
            type: "post",
            dataType: "json",
            success: function (data) {
                if (data.code == 10000) {
                    AppX.appConfig.departmentid = data.result.departmentid;
                    AppX.appConfig.departmentname = data.result.departmentname;
                    AppX.appConfig.realname = data.result.realname;
                    //更新界面显示
                    this.userinfor = data.result;
                    this.domObj.find(".name").text(data.result.realname);
                    this.domObj.find(".company").text(data.result.departmentname);
                    this.domObj.find(".detail-name").text(data.result.realname);
                    this.domObj.find(".detail-phone").text(data.result.phone);
                    this.domObj.find(".detail-email").text(data.result.email);
                    this.domObj.find(".detail-department").text(data.result.departmentname);
                    if (data.result.photo && data.result.photo.length > 0) {
                        var usericonurl = "url(" + AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/' + data.result.photo + ")";//"url(data:image/png;base64," + data.result.photo + ")";
                        this.domObj.find(".avatar").css("background-image", usericonurl);
                        this.domObj.find(".left-avatar").css("background-image", usericonurl);
                    }
                }
            }.bind(this),
            error: function (data) {
                this.toast.Show("获取用户信息失败!");
            }.bind(this)
        });
    }
    /**
    * (方法说明)初始化模块界面事件
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    userInfoInitEvent() {
        this.domObj.find(".avatar").bind("click", this.avatarClick.bind(this));
        this.domObj.find(".btn-modify").bind("click", this.showModifyPassword.bind(this));
        this.domObj.find(".savepwd").bind("click", this.savePassword.bind(this));
        this.domObj.find(".cancelsavepwd").bind("click", this.cancelSavePassword.bind(this));
        this.domObj.find(".btn-exit").bind("click", this.exitsystem.bind(this));
        this.domObj.find(".nav-button").bind("click", this.navbuttonClick.bind(this));
        this.domObj.on("click", ".gis", this.OnGISItemSelected.bind(this))
            .on("click", ".xj", this.OnXJItemSelected.bind(this));
        //单击弹出窗外部时关闭弹出窗
        $(document).on('mouseup', function (e) {
            var userDom = this.domObj.find(".userInfo");
            var navbarDOm = this.domObj.find(".header-navbar");
            if (!userDom.is(e.target) && userDom.has(e.target).length === 0) {
                this.domObj.find(".userInfo .hidded").css({ display: "none" });
            }
            if (!navbarDOm.is(e.target) && navbarDOm.has(e.target).length === 0) {
                this.domObj.find(".header-navbar .hidded").css({ display: "none" });
            }
        }.bind(this));
    }

    exitsystem() {
        $(window).unbind('beforeunload');
        $(window).unbind('unload');
        window.location.href = this.LOGIN_ADDR;
        var exp = new Date();
        exp.setTime(exp.getTime() - 1);
        var sysadress = location.href.replace(/login\/+$/, "");

        var cookiepath = location.pathname.replace(/login\/+$/, "");
        Cookies.set("username", null, {
            expires: exp,
            path: cookiepath
        });
        Cookies.set("token", null, {
            expires: exp,
            path: cookiepath
        });
        Cookies.set('region', null, {
            expires: exp,
            path: cookiepath
        });
        Cookies.set('subsysid', null, {
            expires: exp,
            path: cookiepath
        });
        //调用登出接口
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/logout',
            type: "post",
            dataType: "json",
            success: function (data) {
                if (data.code == 10000) {
                    console.log("正常退出系统!");
                }
            }.bind(this),
            error: function (data) {
                this.toast.Show("退出系统发生异常!");
            }.bind(this)
        });
    }
    avatarClick() {
        var visibility = this.domObj.find(".userInfo .hidded").css("display");
        if (visibility != "none") {
            this.domObj.find(".userInfo .hidded").css({ display: "none" });

        } else {
            this.domObj.find(".userInfo .hidded").css({ display: "block" });
        }

        var display = this.domObj.find(".modify").css("display");
        if (display != "none") {
            this.domObj.find(".modify").css("display", "none");
        }

    }
    showModifyPassword() {
        this.domObj.find(".modify").toggle();
        this.domObj.find(".password1").val("");
        this.domObj.find(".password2").val("");
    }

    savePassword() {
        //验证输入参数长度及相等性
        var pwd1 = this.domObj.find(".password1").val().trim();
        var pwd2 = this.domObj.find(".password2").val().trim();
        if (pwd1.length == 0 || pwd2.lenght == 0) {
            this.toast.Show("密码不能为空!");
            return;
        }
        if (pwd1.length > 50 || pwd2.length > 50) {
            this.toast.Show("密码长度不能超过50个字符!");
            return;
        }
        if (pwd1 != pwd2) {
            this.toast.Show("两次输入的密码必须相同!");
            return;
        }
        //保存,应考虑加密传输
        var option = { password: pwd1 };
        this.saveUserinforToServer(option);
    }
    cancelSavePassword() {
        this.domObj.find(".modify").hide();
        this.domObj.find(".password1").val("");
        this.domObj.find(".password2").val("");
    }

    saveUserinforToServer(option) {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            data: option,
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/userinfor/update',
            type: "post",
            dataType: "json",
            success: function (data) {
                if (data.code == 10000) {
                    //更新界面显示
                    this.toast.Show("更新密码成功!");
                    this.domObj.find(".modify").hide();
                    this.domObj.find(".password1").val("");
                    this.domObj.find(".password2").val("");
                }
            }.bind(this),
            error: function (data) {
                this.toast.Show("更新密码失败!");
                this.domObj.find(".password1").val("");
                this.domObj.find(".password2").val("");
            }.bind(this)
        });
    }

    navbuttonClick() {
        var visibility = this.domObj.find(".header-navbar .hidded").css("display");
        if (visibility != "none") {
            this.domObj.find(".header-navbar .hidded").css({ display: "none" });

        } else {
            this.domObj.find(".header-navbar .hidded").css({ display: "block" });
        }
    }

    OnGISItemSelected() {
        if (Cookies.get('subsysid') == 'gis') {
            this.AppX.runtimeConfig.toast.Show('已加载GIS首页');
            return;
        }
        Cookies.set('subsysid', 'gis');//使用默认初始范围
        this.AppX.runtimeConfig.toast.Show('即将加载GIS首页');
        setTimeout(function () {
            location.reload(false);
        }, 1000);
    }
    OnXJItemSelected() {
        if (Cookies.get('subsysid') == 'xunjian') {
            this.AppX.runtimeConfig.toast.Show('已加载巡检首页');
            return;
        }
        Cookies.set('subsysid', 'xunjian');//使用默认初始范围
        this.AppX.runtimeConfig.toast.Show('即将加载巡检首页');
        setTimeout(function () {
            location.reload(false);
        }, 1000);
    }
}
