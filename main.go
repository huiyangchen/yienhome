package main

import (
    "github.com/astaxie/beego"
    "./controllers"
)


func main() {
    beego.Router("/", &controllers.MainController{})
    beego.Run()
}
