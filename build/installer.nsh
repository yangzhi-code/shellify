; Shellify 安装程序自定义脚本
; 安装完成后打开官网（带版本号参数）
; 用于统计安装版本分布无恶意

!macro customInstall
  ; 安装完成后用默认浏览器打开官网
  ExecShell "open" "https://shellify.yangzhi.me?appVersion=${VERSION}&platform=win"
!macroend

