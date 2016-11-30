var Navbar = ReactBootstrap.Navbar,
Nav = ReactBootstrap.Nav,
NavItem = ReactBootstrap.NavItem,
DropdownButton = ReactBootstrap.DropdownButton,
NavDropdown = ReactBootstrap.NavDropdown,
MenuItem = ReactBootstrap.MenuItem,
Panel = ReactBootstrap.Panel,
PanelGroup = ReactBootstrap.PanelGroup;

const navbarInstance = (
  <Navbar inverse>
    <Navbar.Header>
      <Navbar.Brand>
        <a href="#">怡蒽之家</a>
      </Navbar.Brand>
    </Navbar.Header>
    <Nav>
      <NavItem  href="#">厂房信息</NavItem>
      <NavItem  href="#">店面信息</NavItem>
      <NavItem  href="#">电费查询</NavItem>
      <NavDropdown  title="其他功能" id="basic-nav-dropdown">
        <MenuItem ></MenuItem>
        <MenuItem >Another action</MenuItem>
        <MenuItem >Something else here</MenuItem>
        <MenuItem divider />
        <MenuItem >Separated link</MenuItem>
      </NavDropdown>
    </Nav>
  </Navbar>
);

const homePanel =(
  <PanelGroup  defaultActiveKey="1" accordion>
    <Panel header="怡蒽网站建设中" eventKey="1" >
      本网站主要提供自家房子出租管理，于2016年12月30日开始搭建。采用敏捷迭代开发。
    </Panel>
    <Panel header="需求记录" eventKey="2" >
      1. 厂房出租信息管理；
	* 合同到期提醒；
	* 租金缴交提醒；
	* 综合信息查询；
	* 生成广告信息（markdown）；
      2. 房屋店面出租信息管理；
    </Panel>
  </PanelGroup>
);


ReactDOM.render(
  navbarInstance,
  document.getElementById('nav')
);

ReactDOM.render(
  homePanel,
  document.getElementById('app')
);
