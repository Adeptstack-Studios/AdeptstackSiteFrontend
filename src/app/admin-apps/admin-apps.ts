import {Component, inject} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {map} from 'rxjs';
import {FileService} from '../services/file-service';
import {AppService} from '../services/app-service';
import {ToastService} from '../services/toast-service';
import {AppResponse} from '../models/app-response';
import {App} from '../models/app';
import {AppCard} from '../app-card/app-card';
import {AppModal} from '../app-modal/app-modal';
import {ListToolbar} from '../shared/list-toolbar/list-toolbar';
import {ConfirmService} from '../core/confirm/confirm-service';
import {publishPrivate} from '../shared/listing/publish-private';
import {IMAGE_FILE_HINT, isImageFile} from '../shared/listing/upload-files';

/** The four image fields of an app that are filled by an upload. */
type AppImageField = 'iconUrl' | 'image1Url' | 'image2Url' | 'image3Url';

@Component({
  selector: 'app-admin-apps',
  imports: [
    ReactiveFormsModule,
    AppCard,
    AppModal,
    ListToolbar
  ],
  templateUrl: './admin-apps.html',
  styleUrls: ['../shared/styles/admin-page.css', '../shared/styles/entry-editor.css'],
})
export class AdminApps {
  private readonly appService = inject(AppService);
  private readonly fileService = inject(FileService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  apps: AppResponse[] = [];
  loading = false;
  searchTerm = '';
  isPopupOpen = false;
  popupApp?: App;
  isEdit = false;
  modeString: string = "Create";
  today: string = new Date().toISOString().split('T')[0];
  /** The field whose image is uploading right now. */
  uploading: AppImageField | null = null;

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

    publishedAt: new FormControl('', Validators.required)
  });

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    const request = this.searchTerm
      ? this.appService.searchName(this.searchTerm.toLowerCase())
      : this.appService.getAll();
    request.subscribe({
      next: response => {
        this.apps = response.body ?? [];
        this.loading = false;
      },
      error: () => this.loading = false
    });

    this.modeString = this.isEdit ? "Edit" : "Create";
  }

  generateSlug(name: string) {
    return name.toLowerCase().replace(/ /g, '-');
  }

  onSubmit() {
    if (!this.appForm.valid) {
      this.appForm.markAllAsTouched();
      return;
    }

    const formValue = this.appForm.value;
    const app: App = {id: 0, name: formValue.name, slogan: formValue.slogan, description: formValue.description, iconUrl: formValue.iconUrl, slug: this.generateSlug(formValue.name),
      category: formValue.category, platforms: formValue.platforms, highlighted: formValue.highlighted, legacy: formValue.legacy, image1Url: formValue.image1Url,
      feature1Desc: formValue.feature1Desc, image2Url: formValue.image2Url, feature2Desc: formValue.feature2Desc, image3Url: formValue.image3Url, feature3Desc: formValue.feature3Desc,
      publishedAt: new Date(formValue.publishedAt),
      modrinthId: formValue.modrinthId, curseforgeId: formValue.curseforgeId};

    if (!this.isEdit) {
      this.appService.create(app).subscribe(() => {
        this.toastService.success('App created. It stays private until you make it visible.');
        this.clearForm();
        this.refresh();
      });
    } else {
      app.id = this.popupApp?.id;
      this.appService.update(app).subscribe(() => {
        this.toastService.success('App saved.');
        this.isEdit = false;
        this.clearForm();
        this.refresh();
      });
    }
  }

  clearForm() {
    this.appForm.reset({
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
    this.refresh();
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

        publishedAt: new FormControl(this.popupApp?.publishedAt, Validators.required)
      });
    }
  }

  cancelEdit() {
    this.isEdit = false;
    this.modeString = "Create";
    this.clearForm();
  }

  onSearch(term: string) {
    this.cancelEdit();
    this.searchTerm = term.trim();
    this.refresh();
  }

  protected onImageSelected(event: Event, field: AppImageField) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      this.toastService.error(IMAGE_FILE_HINT);
      input.value = '';
      return;
    }

    this.uploading = field;
    this.fileService.uploadImage(file).subscribe({
      next: (response: any) => {
        this.appForm.patchValue({ [field]: response.url });
        this.uploading = null;
        this.toastService.success('Image uploaded.');
      },
      error: () => this.uploading = null
    });
  }

  async makeAllVisible() {
    const published = await publishPrivate<AppResponse>({
      // apps are few and not paged: the whole list is the "page"
      loadAll: () => this.appService.getAll().pipe(map(response => {
        const items = response.body ?? [];
        return {items, total: items.length};
      })),
      update: item => this.appService.update(item as any),
      noun: ['app', 'apps'],
      confirm: this.confirm,
      toast: this.toastService,
    });
    if (published) this.refresh();
  }
}
