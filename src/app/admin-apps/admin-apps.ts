import {Component, inject} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {AuthorizationService} from '../services/authorization';
import {FileService} from '../services/file-service';
import {AppService} from '../services/app-service';
import {AppResponse} from '../models/app-response';
import {App} from '../models/app';
import {AppCard} from '../app-card/app-card';
import {AppModal} from '../app-modal/app-modal';

@Component({
  selector: 'app-admin-apps',
  imports: [
    ReactiveFormsModule,
    AppCard,
    AppModal
  ],
  templateUrl: './admin-apps.html',
  styleUrl: './admin-apps.css',
})
export class AdminApps {
  auth: AuthorizationService;
  appService: AppService;
  fileService: FileService;
  fb: FormBuilder;
  apps: AppResponse[] | null = [];
  isPopupOpen = false;
  popupApp?: App;
  isEdit = false;
  modeString: string = "Create";
  today: string = new Date().toISOString().split('T')[0];
  isUploading1 = false;
  isUploading2 = false;
  isUploading3 = false;
  isUploading4 = false;

  appForm: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    slogan: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    iconUrl: new FormControl('', Validators.required),
    platforms: new FormControl('', Validators.required),
    category: new FormControl('', Validators.required),
    highlighted: new FormControl(false),
    legacy: new FormControl(false),

    modrinthId: new FormControl(''),
    curseforgeId: new FormControl(''),

    image1Url: new FormControl('', Validators.required),
    image2Url: new FormControl('', Validators.required),
    image3Url: new FormControl('', Validators.required),
    feature1Desc: new FormControl('', Validators.required),
    feature2Desc: new FormControl('', Validators.required),
    feature3Desc: new FormControl('', Validators.required),

    publishedAt: new FormControl('', Validators.required),
    visible: new FormControl(false)
  });

  constructor() {
    this.auth = inject(AuthorizationService);
    this.appService = inject(AppService);
    this.fileService = inject(FileService);
    this.fb = inject(FormBuilder);

    this.update()
  }

  update() {
    this.appService.getAll().subscribe({
      next: (response) => {
        this.apps = response.body;
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

  generateSlug(name: string) {
    return name.toLowerCase().replace(/ /g, '-');
  }

  onSubmit() {
    if (this.appForm.valid) {
      const formValue = this.appForm.value;

      const app: App = {id: 0, name: formValue.name, slogan: formValue.slogan, description: formValue.description, iconUrl: formValue.iconUrl, slug: this.generateSlug(formValue.name),
        category: formValue.category, platforms: formValue.platforms, highlighted: formValue.highlighted, legacy: formValue.legacy, image1Url: formValue.image1Url,
        feature1Desc: formValue.feature1Desc, image2Url: formValue.image2Url, feature2Desc: formValue.feature2Desc, image3Url: formValue.image3Url, feature3Desc: formValue.feature3Desc,
        publishedAt: new Date(formValue.publishedAt), visible: formValue.visible,
        modrinthId: formValue.modrinthId, curseforgeId: formValue.curseforgeId};

      if (!this.isEdit) {
        this.appService.create(app).subscribe({
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
        app.id = this.popupApp?.id;
        this.appService.update(app).subscribe({
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
    else {
      this.appForm?.markAllAsTouched();
    }
  }

  clearForm() {
    this.appForm.reset({
      visible: false,
      highlighted: false,
      legacy: false
    });
  }

  protected onAppClicked(app: App) {
    this.popupApp = app;
    this.isPopupOpen = !this.isPopupOpen;
  }

  closeModal() {
    this.isPopupOpen = false;
    this.update();
  }

  onEditApp(id: number) {
    this.isPopupOpen = false;

    if (this.popupApp?.id == id) {
      this.isEdit = true;
      this.modeString = "Edit";

      this.appForm = this.fb.group({
        name: new FormControl(this.popupApp?.name, Validators.required),
        slogan: new FormControl(this.popupApp?.slogan, Validators.required),
        description: new FormControl(this.popupApp?.description, Validators.required),
        iconUrl: new FormControl(this.popupApp?.iconUrl, Validators.required),
        platforms: new FormControl(this.popupApp?.platforms, Validators.required),
        category: new FormControl(this.popupApp?.category, Validators.required),
        highlighted: new FormControl(this.popupApp?.highlighted),
        legacy: new FormControl(this.popupApp?.legacy),

        modrinthId: new FormControl(this.popupApp?.modrinthId),
        curseforgeId: new FormControl(this.popupApp?.curseforgeId),

        image1Url: new FormControl(this.popupApp?.image1Url, Validators.required),
        image2Url: new FormControl(this.popupApp?.image2Url, Validators.required),
        image3Url: new FormControl(this.popupApp?.image3Url, Validators.required),
        feature1Desc: new FormControl(this.popupApp?.feature1Desc, Validators.required),
        feature2Desc: new FormControl(this.popupApp?.feature2Desc, Validators.required),
        feature3Desc: new FormControl(this.popupApp?.feature3Desc, Validators.required),

        publishedAt: new FormControl(this.popupApp?.publishedAt, Validators.required),
        visible: new FormControl(this.popupApp?.visible)
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

    this.appService.searchName(event.target.value.toLowerCase()).subscribe({
      next: (response) => {
        this.apps = response.body;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    });
  }

  protected onIconSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.isUploading1 = true;

      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.appForm.patchValue({
            iconUrl: uploadedUrl
          });

          this.isUploading1 = false;
        },
        error: (err: any) => {
          console.error("Upload fehlgeschlagen", err);
          this.isUploading1 = false;
        }
      });
    }
  }

  protected onI1Selected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.isUploading2 = true;

      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.appForm.patchValue({
            image1Url: uploadedUrl
          });

          this.isUploading2 = false;
        },
        error: (err: any) => {
          console.error("Upload fehlgeschlagen", err);
          this.isUploading2 = false;
        }
      });
    }
  }

  protected onI2Selected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.isUploading3 = true;

      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.appForm.patchValue({
            image2Url: uploadedUrl
          });

          this.isUploading3 = false;
        },
        error: (err: any) => {
          console.error("Upload fehlgeschlagen", err);
          this.isUploading3 = false;
        }
      });
    }
  }

  protected onI3Selected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.isUploading4 = true;

      this.fileService.uploadImage(file).subscribe({
        next: (response: any) => {
          const uploadedUrl = response.url;

          this.appForm.patchValue({
            image3Url: uploadedUrl
          });

          this.isUploading4 = false;
        },
        error: (err: any) => {
          console.error("Upload fehlgeschlagen", err);
          this.isUploading4 = false;
        }
      });
    }
  }

  makeAllVisible() {
    if (this.apps) {
      this.apps.forEach(item => {
        if (!item.visible) {
          item.visible = true;
          this.appService.update(item as any).subscribe({
            error: (err) => console.error(err)
          });
        }
      });
    }
  }
}
