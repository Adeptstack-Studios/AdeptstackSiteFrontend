import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {News} from '../models/news';
import {NewsService} from '../services/news-service';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NewsCard} from '../news-card/news-card';
import {PostModal} from '../post-modal/post-modal';

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
  news: News[] | null = [];
  isPopupOpen = false;
  popupNews?: News;

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
  }

  onSubmit() {
    if (this.newsForm.valid) {
      const formValue = this.newsForm.value;
      const news: News = {id: 0, title: formValue.title, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, category: formValue.category, publishedAt: new Date(formValue.publishedAt)};

      this.newsService.create(news).subscribe({
        next: (response) => {
          console.log("received: " + response.body);
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

  protected onPostClicked(post: News) {
    this.popupNews = post;
    this.isPopupOpen = !this.isPopupOpen;
  }

  closeModal() {
    this.isPopupOpen = false;
    this.update();
  }
}
