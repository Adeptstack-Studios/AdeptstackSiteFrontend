export const environment = {
  production: false,
  login : 'http://localhost:8080/api/auth/login',
  verifyLogin : 'http://localhost:8080/api/auth/verifyLogin',
  register : 'http://localhost:8080/api/auth/register',
  me : 'http://localhost:8080/api/auth/me',

  newsGet: 'http://localhost:8080/api/news/get',
  newsCreate: 'http://localhost:8080/api/news/create',
  newsUpdate: 'http://localhost:8080/api/news/update',
  newsDelete: 'http://localhost:8080/api/news/delete',
  searchNews: 'http://localhost:8080/api/news/search?name=',

  changelogsGet: 'http://localhost:8080/api/changelogs/get',
  changelogsCreate: 'http://localhost:8080/api/changelogs/create',
  changelogsUpdate: 'http://localhost:8080/api/changelogs/update',
  changelogsDelete: 'http://localhost:8080/api/changelogs/delete',
  searchChangelogs: 'http://localhost:8080/api/changelogs/search?name=',
};
