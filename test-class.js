class Base {
  constructor(options) {
    this.options = options;
  }
}
class Derived extends Base {
  constructor(cookieService) {
    const fn = () => {
      console.log(this.cookieService);
    };
    super({ fn });
    this.cookieService = cookieService;
    this.fn = fn;
  }
}
const d = new Derived('my_service');
d.fn();
