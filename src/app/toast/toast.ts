import {Component, inject} from '@angular/core';
import {CircleAlert, CircleCheck, Info, LucideAngularModule, X} from 'lucide-angular';
import {ToastService, ToastKind} from '../services/toast-service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  protected readonly toastService = inject(ToastService);
  protected readonly closeIcon = X;
  protected readonly kindIcon: Record<ToastKind, typeof Info> = {success: CircleCheck, error: CircleAlert, info: Info};
}
