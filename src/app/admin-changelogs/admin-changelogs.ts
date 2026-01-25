import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {ChangelogsService} from '../services/changelogs-service';
import {Changelogs} from '../models/changelogs';
import {PostModal} from '../post-modal/post-modal';
import {ChangelogCard} from '../changelog-card/changelog-card';

@Component({
  selector: 'app-admin-changelogs',
  standalone: true,
  templateUrl: './admin-changelogs.html',
  imports: [
    FormsModule,
    PostModal,
    ReactiveFormsModule,
    ChangelogCard
  ],
  styleUrl: './admin-changelogs.css'
})
export class AdminChangelogs {
  auth: AuthorizationService;
  changelogService: ChangelogsService;
  fb: FormBuilder;
  changelogs: Changelogs[] | null = [];
  isPopupOpen = false;
  popupChangelog?: Changelogs;
  isEdit = false;
  modeString: string = "Create";
  today: Date = new Date();

  changelogForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    content: new FormControl('', Validators.required),
    imageUrl: new FormControl('', Validators.required),
    app: new FormControl('', Validators.required),
    channel: new FormControl('', Validators.required),
    version: new FormControl('', Validators.required),
    publishedAt: new FormControl('', Validators.required)
  });

  constructor() {
    this.auth = inject(AuthorizationService);
    this.changelogService = inject(ChangelogsService);
    this.fb = inject(FormBuilder);

    this.update()
  }

  update() {
    this.changelogService.getAll().subscribe({
      next: (response) => {
        this.changelogs = response.body;
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
      if (this.changelogForm.valid) {
        const formValue = this.changelogForm.value;
        const changelog: Changelogs = {id: 0, title: formValue.title, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, app: formValue.app, channel: formValue.channel, version: formValue.version, publishedAt: new Date(formValue.publishedAt)};

        this.changelogService.create(changelog).subscribe({
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
        this.changelogForm?.markAllAsTouched();
      }
    }
    else {
      if (this.changelogForm.valid) {
        const formValue = this.changelogForm.value;
        const changelog: Changelogs = {id: this.popupChangelog?.id, title: formValue.title, description: formValue.description, content: formValue.content, imageUrl: formValue.imageUrl, app: formValue.app, channel: formValue.channel, version: formValue.version, publishedAt: new Date(formValue.publishedAt)};

        this.changelogService.update(changelog).subscribe({
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
    this.changelogForm.reset();
  }

  protected onPostClicked(post: Changelogs) {
    this.popupChangelog = post;
    this.isPopupOpen = !this.isPopupOpen;
  }

  closeModal() {
    this.isPopupOpen = false;
    this.update();
  }

  onEditPost(id: number) {
    this.isPopupOpen = false;

    if (this.popupChangelog?.id == id) {
      this.isEdit = true;
      this.modeString = "Edit";

      this.changelogForm = this.fb.group({
        title: new FormControl(this.popupChangelog?.title, Validators.required),
        description: new FormControl(this.popupChangelog?.description, Validators.required),
        content: new FormControl(this.popupChangelog?.content, Validators.required),
        imageUrl: new FormControl(this.popupChangelog?.imageUrl, Validators.required),
        app: new FormControl(this.popupChangelog?.app, Validators.required),
        channel: new FormControl(this.popupChangelog?.channel, Validators.required),
        version: new FormControl(this.popupChangelog?.version, Validators.required),
        publishedAt: new FormControl(this.popupChangelog?.publishedAt, Validators.required)
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

    this.changelogService.search(event.target.value.toLowerCase()).subscribe({
      next: (response) => {
        this.changelogs = response.body;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    });
  }
}
