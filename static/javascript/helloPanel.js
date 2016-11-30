
var Jumbotron = ReactBootstrap.Jumbotron;
var Button = ReactBootstrap.Button;

const jumbotronInstance = (
  <Jumbotron>
    <h1>怡蒽之家建设中!</h1>
    <p>怡蒽之家是为了方便自家房屋出租管理所搭建，主要功能将包括综合信息查询、短信通知到期、通知缴交房租和电费等。</p>
    <p><Button bsStyle="primary">了解更多</Button></p>
  </Jumbotron>
);

ReactDOM.render(jumbotronInstance, document.getElementById('hello'));
