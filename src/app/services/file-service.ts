import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpEvent} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  http: HttpClient;

  constructor() {
    this.http = inject(HttpClient);
  }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(environment.uploadImage, formData);
  }

  /** Reports progress, videos take a while: watch for HttpEventType.UploadProgress. */
  uploadVideo(file: File): Observable<HttpEvent<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(environment.uploadVideo, formData, {reportProgress: true, observe: 'events'});
  }

  uploadApp(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(environment.uploadApp, formData);
  }
}
