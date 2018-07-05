/* CONFIGURE START */
var HOST_NAME = "192.98.151.49/webapi",
    // "192.168.1.90/webapi",
    // "192.98.151.49:8088/webapi",
    xj = "192.98.151.40/xjapi/",
    xjtoken = "58E9A0EF2ADE4809A742FD86220090EA",
    //    xj = "http://192.168.1.106:8088",
    // xj = "http://tfgps.tunnel.qydev.com",
    SYS_ADDR = location.href.replace(/login\/+$/, ""),
    COOKIE_EXPIRES = 1,
    COOKIE_PATH = location.pathname.replace(/login\/+$/, "");
/* CONFIGURE END */

window.onload = function () {

    /* acquire the user input */
    var userInput = $(".username");
    /* acquire the password input */
    var passwordInput = $('.password');
    var btnLogin = $('.login');
    /* set the user input focused */
    userInput[0].focus();
    $(document).keydown(enterKeyDown.bind(this));
    btnLogin.on('click', loginCallBack.bind(this));

    function enterKeyDown() {
        if (event.keyCode == 13) {
            loginCallBack.bind(this)();
        }
    }

    function loginCallBack(result) {
        if (userInput.val() == '' && passwordInput.val() != '') {
            $(".user").addClass('has-error');
            userInput.attr("placeholder", "不能为空");
        } else if (userInput.val() != '' && passwordInput.val() == '') {
            $(".password").addClass('has-error');
            passwordInput.attr("placeholder", "不能为空");
        } else if (userInput.val() == '' && passwordInput.val() == '') {
            $(".user").addClass('has-error');
            userInput.attr("placeholder", "不能为空");
            $(".password").addClass('has-error');
            passwordInput.attr("placeholder", "不能为空");
        } else {

            $.ajax({
                url: "http://" + HOST_NAME + "/api/webapp/login",
                data: {
                    "username": $.trim(userInput.val()),
                    "password": $.trim(passwordInput.val())
                },
                type: "post",
                dataType: "json",
                success: ajaxCallBack.bind(this),
                error: errorCallBack.bind(this)
            });
        }
    }

    function ajaxCallBack(result) {
        if (result.code == 10000) {
            var userName = userInput.val();
            var token = result.result.token;
            var userid = result.result.userid;
            var departmentid = result.result.departmentid;
            var groupid = result.result.groupid;
            var range = result.result.range;
            Cookies.set("username", userName, {
                /**expires: COOKIE_EXPIRES,**/
                path: COOKIE_PATH
            });
            Cookies.set("userid", userid, {
                /** expires: COOKIE_EXPIRES,**/
                path: COOKIE_PATH
            });
            Cookies.set("token", token, {
                /**expires: COOKIE_EXPIRES,**/
                path: COOKIE_PATH
            });

            Cookies.set("range", range, {
                /**expires: COOKIE_EXPIRES,**/
                path: COOKIE_PATH
            });

            Cookies.set("departmentid", departmentid, {
                /** expires: COOKIE_EXPIRES,**/
                path: COOKIE_PATH
            });

            Cookies.set("groupid", groupid, {
                /**expires: COOKIE_EXPIRES,**/
                path: COOKIE_PATH
            });


            //登录xjapi.设置token

            // $.ajax({
            //     url: "http://" + xj + "/api/account/login",
            //     data: {
            //         "loginid": "admin",
            //         "loginpass": "123456"
            //     },
            //     type: "post",
            //     dataType: "json",
            //     success: function (result) {
            //         Cookies.set("xjxj", result.result.token, {
            //             /** expires: COOKIE_EXPIRES,**/
            //             path: COOKIE_PATH
            //         });
            //         window.location.href = SYS_ADDR;
            //     },
            //     error: errorCallBack.bind(this)
            // });

            // 添加登录日志

            $.ajax({
                headers: {
                    'Token': xjtoken,
                    'departmentid': departmentid,
                },
                url: "http://" + xj + "/api/Log/Add",
                data: {
                    "userid": result.result.userid,
                    "username": userInput.val()
                },
                type: "post",
                dataType: "json",
                success: function (result) {

                    window.location.href = SYS_ADDR;
                },
                error: errorCallBack.bind(this)
            });


            // window.location.href = SYS_ADDR;
        } else if (result.code != 10000) {
            $(".errorInfoUsername").text(result.message);
            $(".errorInfoPassword").text('');
        }
    }

    function errorCallBack(mesg) {
        console.log(mesg);
    }
}
