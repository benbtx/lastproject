declare var Cookies
declare var esri
var configFile = "";

// if (Cookies.get('region')) {
configFile = "configure.js";
// } else {
//     configFile = "configure.manage.js";
// };

// 加载初始配置文件
require({}, [configFile], (AppX) => {
    loadApp(AppX);
    initEvent();
});

// 加载动态配置文件
function loadApp(AppX) {
    // 构造登录页面的 URL
    var LOGIN_ADDR = window.location.href.replace(/\/+$/, "/login");

    // 通过 Cookie 获取用户名和 Token
    var username = Cookies.get('username'),
        token = Cookies.get('token'),
        range = Cookies.get('range'),
        departmentid = Cookies.get('departmentid'),
        groupid = Cookies.get('groupid'),
        xjxj = Cookies.get('xjxj');

    if (username && token) {
        /* 用户登录过 */
        AppX.appConfig.usertoken = token;
        AppX.appConfig.range = range;
        // AppX.appConfig.xjxj = xjxj;
        AppX.appConfig.departmentid = departmentid;
        AppX.appConfig.groupid = groupid;
        esri.config.defaults.io.timeout = 120000;
        // 远程请求配置文件
        $.ajax({
            headers: {
                'Authorization-Token': token
            },
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/webresource',
            type: "post",
            dataType: "json",
            data: {
                code: Cookies.get('region'),
                subsysid: Cookies.get('subsysid')
            },
            success: function (data) {
                if (data.code == 10000) {
                    if (data.result.extent)
                        AppX.appConfig.initextent = data.result.extent;
                    if (!AppX.appConfig.debug) {
                        AppX.appConfig.loadOnStartWidgets = data.result.widgets.loadOnStartWidgets;
                        AppX.appConfig.menuBarWidgets = data.result.widgets.menuBarWidgets;
                    }
                    //填充GIS配置信息到AppX.appConfig.gis
                    for (var pro in AppX.appConfig.gisResource) {
                        var config = _.filter(data.result.gisconfig, function (item: any) {
                            return item.groupname == AppX.appConfig.gisResource[pro].groupname;
                        });
                        AppX.appConfig.gisResource[pro].config = config;
                    }
                    require(AppX.dojoConfig, ['core/LoadManager.class', 'dojo/domReady!'], function (LoadManager) {
                        (new LoadManager).load(AppX.appConfig.loadOnStartWidgets);
                    });
                }
            }.bind(this)
        });

        // 使用本地配置文件
        // require(AppX.dojoConfig, ['core/LoadManager.class', 'dojo/domReady!'], function (LoadManager) {
        //     (new LoadManager).load(AppX.appConfig.loadOnStartWidgets);
        // });
    } else {
        // 如果未找到 Cookie 则代表未登录
        // 跳转到登陆页面
        window.location.href = LOGIN_ADDR;
    }
}

function initEvent() {
    // $(window).on('beforeunload', function () {
    //     return '确定退出系统吗？';
    // });
    $(window).on('unload', function () {
        //调用登出接口
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + '/webapp/logout',
            type: "post",
            dataType: "json",
            async: false,
            success: function (data) {
                if (data.code == 10000) {
                    console.log("正常退出系统!");
                }
            }.bind(this),
            error: function (data) {
                this.toast.Show("退出系统发生异常!");
            }.bind(this)
        });
    });
}
