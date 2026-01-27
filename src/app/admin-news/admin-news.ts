import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {News} from '../models/news';
import {NewsService} from '../services/news-service';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NewsCard} from '../news-card/news-card';
import {PostModal} from '../post-modal/post-modal';
import {FileService} from '../services/file-service';

@Component({
  selector: 'app-admin-news',
  standalone: true,
  templateUrl: './admin-news.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NewsCard,
    PostModal
  ],
  styleUrl: './admin-news.css'
})
export class AdminNews {
  auth: AuthorizationService;
  newsService: NewsService;
  fileService: FileService;
  fb: FormBuilder;
  news: News[] | null = [];
  isPopupOpen = false;
  popupNews?: News;
  isEdit = false;
  modeString: string = "Create";
  today: string = new Date().toISOString().split('T')[0];
  isUploading = false;

  newsForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    content: new FormControl('', Validators.required),
    imageUrl: new FormControl('', Validators.required),
    category: new FormControl('', Validators.required),
    publishedAt: new FormControl('', Validators.required)
  });

  constructor() {
    this.auth = inject(AuthorizationService);
    this.newsService = inject(NewsService);
    this.fileService = inject(FileService);
    this.fb = inject(FormBuilder);

    this.update()
  }

  update() {
    this.newsService.getAll().subscribe({
      next: (response) => {
        this.news = response.body;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    });

    if (this.isEdit) {
      this.modeString = "Edit";
    }
    else {
      this.modeString = "Create";
    }
  }

  onSubmit() {
    if (!this.isEdit) {
      if (this.newsForm.valid) {
        const formValue = this.newsForm.value;
        const news: News = {id: 0, title: formValue.title, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, category: formValue.category, publishedAt: new Date(formValue.publishedAt)};

        this.newsService.create(news).subscribe({
          next: (response) => {
            console.log("received: " + response.body);
            this.clearForm();
            this.update();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
      else {
        this.newsForm?.markAllAsTouched();
      }
    }
    else {
      if (this.newsForm.valid) {
        const formValue = this.newsForm.value;
        const news: News = {id: this.popupNews?.id, title: formValue.title, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, category: formValue.category, publishedAt: new Date(formValue.publishedAt)};

        this.newsService.update(news).subscribe({
          next: (response) => {
            console.log("received: " + response.body);
            this.isEdit = false;
            this.clearForm();
            this.update();
          }, error: (error) => {
            console.log("error: " + error.message);
          }
        });
      }
    }
  }

  clearForm() {
    this.newsForm.reset();
  }

  protected onPostClicked(post: News) {
    this.popupNews = post;
    this.isPopupOpen = !this.isPopupOpen;
  }

  closeModal() {
    this.isPopupOpen = false;
    this.update();
  }

  onEditPost(id: number) {
    this.isPopupOpen = false;

    if (this.popupNews?.id == id) {
      this.isEdit = true;
      this.modeString = "Edit";

      this.newsForm = this.fb.group({
        title: new FormControl(this.popupNews?.title, Validators.required),
        description: new FormControl(this.popupNews?.description, Validators.required),
        content: new FormControl(this.popupNews?.content, Validators.required),
        imageUrl: new FormControl(this.popupNews?.imageUrl, Validators.required),
        category: new FormControl(this.popupNews?.category, Validators.required),
        publishedAt: new FormControl(this.popupNews?.publishedAt, Validators.required)
      });
    }
  }

  cancelEdit() {
    this.isEdit = false;
    this.modeString = "Create";
    this.clearForm();
  }

  onSearch(event: any) {
    this.cancelEdit()

    this.newsService.searchTitle(event.target.value.toLowerCase()).subscribe({
      next: (response) => {
        this.news = response.body;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.isUploading = true;

      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.newsForm.patchValue({
            imageUrl: uploadedUrl
          });

          this.isUploading = false;
        },
        error: (err: any) => {
          console.error("Upload fehlgeschlagen", err);
          this.isUploading = false;
        }
      });
    }
  }
}
