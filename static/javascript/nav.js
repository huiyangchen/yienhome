
var Navbar = ReactBootstrap.Navbar,
NavItem = ReactBootstrap.NavItem,
Nav = ReactBootstrap.Nav,
NavDropdown = ReactBootstrap.NavDropdown,
MenuItem = ReactBootstrap.MenuItem;
var brandName = "怡蒽之家";

const navbarInstance = (
  <Navbar inverse collapseOnSelect>
    <Navbar.Header>
      <Navbar.Brand>
        <a href="#">{brandName}</a>
      </Navbar.Brand>
      <Navbar.Toggle />
    </Navbar.Header>
    <Navbar.Collapse>
      <Nav>
        <NavItem eventKey={1} href="#">厂房信息</NavItem>
        <NavItem eventKey={2} href="#">店面信息</NavItem>
        <NavDropdown eventKey={3} title="其他功能" id="basic-nav-dropdown">
          <MenuItem eventKey={3.1}>Action</MenuItem>
          <MenuItem eventKey={3.2}>Another action</MenuItem>
          <MenuItem eventKey={3.3}>Something else here</MenuItem>
          <MenuItem divider />
          <MenuItem eventKey={3.3}>Separated link</MenuItem>
        </NavDropdown>
      </Nav>
      <Nav pullRight>
        <NavItem eventKey={1} href="#">登入</NavItem>
        <NavItem eventKey={2} href="#">用户控制面板</NavItem>
      </Nav>
    </Navbar.Collapse>
  </Navbar>
);


ReactDOM.render(navbarInstance, document.getElementById('nav'));
