import {Component, computed, DestroyRef, inject} from '@angular/core';
import {LucideAngularModule, RefreshCw, Timer} from 'lucide-angular';
import {SESSION_URGENT_SECONDS, SESSION_WARN_SECONDS, SessionService} from './session-service';
import {ToastService} from '../../services/toast-service';

/** The countdown in the top bar. A click extends the session. */
@Component({
  selector: 'app-session-timer',
  imports: [LucideAngularModule],
  templateUrl: './session-timer.html',
  styleUrl: './session-timer.css'
})
export class SessionTimer {
  protected readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  protected readonly icons = {RefreshCw, Timer};

  protected readonly state = computed(() => {
    const left = this.session.secondsLeft() ?? Infinity;
    return left <= SESSION_URGENT_SECONDS ? 'urgent' : left <= SESSION_WARN_SECONDS ? 'warn' : 'ok';
  });

  protected readonly clock = computed(() => {
    const left = this.session.secondsLeft() ?? 0;
    const minutes = Math.floor(left / 60);
    const seconds = left % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  /** Changes once a minute, so screen readers are not flooded with every second. */
  protected readonly label = computed(() => {
    const minutes = Math.ceil((this.session.secondsLeft() ?? 0) / 60);
    return `Session ends in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}. Extend session`;
  });

  constructor() {
    this.session.watch(inject(DestroyRef));
  }

  protected extend() {
    if (this.session.extending()) return;
    this.session.extend().subscribe(() => this.toast.success('Session extended.'));
  }
}
