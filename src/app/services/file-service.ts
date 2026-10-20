import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpEvent} from '@angular/common/http';
import {Observable} from 'rxjs';
import {MediaCleanup, MediaFile} from '../models/media';
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

  /** Every upload, newest first, with where it is used. */
  list(): Observable<MediaFile[]> {
    return this.http.get<MediaFile[]>(environment.files);
  }

  /** Owners only, and only a file nothing uses. */
  delete(path: string): Observable<void> {
    return this.http.delete<void>(environment.files, {params: {path}});
  }

  /** Owners only: every unused file older than a day. */
  deleteUnused(): Observable<MediaCleanup> {
    return this.http.delete<MediaCleanup>(environment.files + '/unused');
  }

  /** Picks the upload by the kind of file; images, videos and installers. */
  upload(file: File): Observable<{ url: string }> {
    const name = file.name.toLowerCase();
    if (/\.(mp4|webm)$/.test(name)) {
      const formData = new FormData();
      formData.append('file', file);
      return this.http.post<{ url: string }>(environment.uploadVideo, formData);
    }
    return /\.(exe|msi)$/.test(name) ? this.uploadApp(file) : this.uploadImage(file);
  }
}
