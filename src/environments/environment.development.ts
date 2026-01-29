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
  searchNews: 'http://localhost:8080/api/news/search?title=',

  changelogsGetAll: 'http://localhost:8080/api/changelogs/get',
  changelogsGetById: 'http://localhost:8080/api/changelogs/get/',
  changelogsGetByApp: 'http://localhost:8080/api/changelogs/getBy?app=',
  changelogsGetLatestByAppByChannel: 'http://localhost:8080/api/changelogs/getLatestBy?app=',
  changelogsCreate: 'http://localhost:8080/api/changelogs/create',
  changelogsUpdate: 'http://localhost:8080/api/changelogs/update',
  changelogsDelete: 'http://localhost:8080/api/changelogs/delete',
  searchChangelogs: 'http://localhost:8080/api/changelogs/searchBy?title=',
  searchByChangelogs: 'http://localhost:8080/api/changelogs/searchBy?app=',

  uploadApp: 'http://localhost:8080/api/files/uploadApp',
  uploadImage: 'http://localhost:8080/api/files/uploadImage',
};
