import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl} from '@angular/forms';
import {ChangelogsService} from '../services/changelogs-service';
import {AppService} from '../services/app-service';
import {Changelogs} from '../models/changelogs';
import {AppResponse} from '../models/app-response';
import {PostModal} from '../post-modal/post-modal';
import {ChangelogCard} from '../changelog-card/changelog-card';
import {FileService} from '../services/file-service';

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
  appService: AppService;
  fileService: FileService;
  fb: FormBuilder;

  changelogs: Changelogs[] = [];
  filteredChangelogs: Changelogs[] = [];
  apps: AppResponse[] = [];

  uniqueAppIds: (number | undefined)[] = [];
  uniqueChannels: (string | undefined)[] = [];

  selectedAppId: number | string = '';
  selectedChannel: string = '';
  searchTerm: string = '';

  isPopupOpen = false;
  popupChangelog?: Changelogs;
  isEdit = false;
  modeString: string = "Create";
  today: string = new Date().toISOString().split('T')[0];
  isUploading = false;

  changelogForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    content: new FormControl('', Validators.required),
    imageUrl: new FormControl('', Validators.required),
    appUrl: new FormControl(''),
    microsoftStoreUrl: new FormControl(''),
    playStoreUrl: new FormControl(''),
    appStoreUrl: new FormControl(''),
    steamUrl: new FormControl(''),
    appId: new FormControl('', Validators.required),
    channel: new FormControl('', Validators.required),
    version: new FormControl('', Validators.required),
    publishedAt: new FormControl('', Validators.required)
  }, { validators: this.atLeastOneUrlValidator });

  constructor() {
    this.auth = inject(AuthorizationService);
    this.changelogService = inject(ChangelogsService);
    this.appService = inject(AppService);
    this.fileService = inject(FileService);
    this.fb = inject(FormBuilder);

    this.update()
    this.loadApps();
  }

  loadApps() {
    this.appService.getAll().subscribe({
      next: (response) => {
        if (response.body) {
          this.apps = response.body;
        }
      },
      error: (error) => {
        console.log("error loading apps: " + error.message);
      }
    });
  }

  atLeastOneUrlValidator(group: AbstractControl): { [key: string]: any } | null {
    const appUrl = group.get('appUrl')?.value;
    const microsoftStoreUrl = group.get('microsoftStoreUrl')?.value;
    const playStoreUrl = group.get('playStoreUrl')?.value;
    const appStoreUrl = group.get('appStoreUrl')?.value;
    const steamUrl = group.get('steamUrl')?.value;

    if (!appUrl && !microsoftStoreUrl && !playStoreUrl && !appStoreUrl && !steamUrl) {
      return { 'noUrlProvided': true };
    }
    return null;
  }

  update() {
    this.changelogService.getAll().subscribe({
      next: (response) => {
        if(response.body) {
          this.changelogs = response.body;
          this.extractFilterOptions();
          this.applyFilters();
        }
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

  extractFilterOptions() {
    const appIds = new Set(this.changelogs.map(c => c.appId));
    this.uniqueAppIds = Array.from(appIds).sort((a, b) => (a || 0) - (b || 0));

    const channels = new Set(this.changelogs.map(c => c.channel));
    this.uniqueChannels = Array.from(channels).sort();
  }

  getAppName(appId?: number): string {
    return this.apps.find(a => a.id === appId)?.name || 'Unknown App';
  }

  onFilterChange() {
    this.applyFilters();
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applyFilters();
  }

  applyFilters() {
    let temp = [...this.changelogs];

    if (this.selectedAppId) {
      temp = temp.filter(item => item.appId === Number(this.selectedAppId));
    }

    if (this.selectedChannel) {
      temp = temp.filter(item => item.channel === this.selectedChannel);
    }

    if (this.searchTerm) {
      temp = temp.filter(item =>
        (item.title && item.title.toLowerCase().includes(this.searchTerm)) ||
        (item.version && item.version.toLowerCase().includes(this.searchTerm))
      );
    }

    temp.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;

      return dateB - dateA;
    });

    this.filteredChangelogs = temp;
  }

  onSubmit() {
    if (!this.isEdit) {
      if (this.changelogForm.valid) {
        const formValue = this.changelogForm.value;
        const selectedApp = this.apps.find(a => a.id === Number(formValue.appId));
        const changelog: Changelogs = {
          id: 0,
          title: formValue.title,
          description: formValue.description,
          content: formValue.content,
          imageUrl: formValue.imageUrl,
          appUrl: formValue.appUrl,
          microsoftStoreUrl: formValue.microsoftStoreUrl,
          playStoreUrl: formValue.playStoreUrl,
          appStoreUrl: formValue.appStoreUrl,
          steamUrl: formValue.steamUrl,
          appId: Number(formValue.appId),
          app: selectedApp?.name,
          channel: formValue.channel,
          version: formValue.version,
          publishedAt: new Date(formValue.publishedAt)
        };

        this.changelogService.create(changelog).subscribe({
          next: () => {
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
        const selectedApp = this.apps.find(a => a.id === Number(formValue.appId));
        const changelog: Changelogs = {
          id: this.popupChangelog?.id,
          title: formValue.title,
          description: formValue.description,
          content: formValue.content,
          imageUrl: formValue.imageUrl,
          appUrl: formValue.appUrl,
          microsoftStoreUrl: formValue.microsoftStoreUrl,
          playStoreUrl: formValue.playStoreUrl,
          appStoreUrl: formValue.appStoreUrl,
          steamUrl: formValue.steamUrl,
          appId: Number(formValue.appId),
          app: selectedApp?.name,
          channel: formValue.channel,
          version: formValue.version,
          publishedAt: new Date(formValue.publishedAt)
        };

        this.changelogService.update(changelog).subscribe({
          next: () => {
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

  clearAppUrl() {
    this.changelogForm.patchValue({ appUrl: '' });
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
        appUrl: new FormControl(this.popupChangelog?.appUrl),
        microsoftStoreUrl: new FormControl(this.popupChangelog?.microsoftStoreUrl),
        playStoreUrl: new FormControl(this.popupChangelog?.playStoreUrl),
        appStoreUrl: new FormControl(this.popupChangelog?.appStoreUrl),
        steamUrl: new FormControl(this.popupChangelog?.steamUrl),
        appId: new FormControl(this.popupChangelog?.appId, Validators.required),
        channel: new FormControl(this.popupChangelog?.channel, Validators.required),
        version: new FormControl(this.popupChangelog?.version, Validators.required),
        publishedAt: new FormControl(this.popupChangelog?.publishedAt, Validators.required)
      }, { validators: this.atLeastOneUrlValidator });
    }
  }

  cancelEdit() {
    this.isEdit = false;
    this.modeString = "Create";
    this.clearForm();
  }

  onImageSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      const fileName = file.name.toLowerCase();
      const isAllowed = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');

      if (!isAllowed) {
        alert('Invalid File! Please choose .jpg, .jpeg, .png, webp files.');
        event.target.value = '';
        return;
      }

      this.isUploading = true;
      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.changelogForm.patchValue({
            imageUrl: uploadedUrl
          });

          this.isUploading = false;
        },
        error: (err: any) => {
          console.error("Upload failed", err);
          this.isUploading = false;
        }
      });
    }
  }

  onAppSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      const fileName = file.name.toLowerCase();
      const isAllowed = fileName.endsWith('.exe') || fileName.endsWith('.msi');

      if (!isAllowed) {
        alert('Invalid File! Please choose .exe or .msi files.');
        event.target.value = '';
        return;
      }

      this.isUploading = true;
      this.fileService.uploadApp(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.changelogForm.patchValue({
            appUrl: uploadedUrl
          });

          this.isUploading = false;
        },
        error: (err: any) => {
          console.error("Upload failed", err);
          this.isUploading = false;
        }
      });
    }
  }
}
