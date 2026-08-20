/**
 * SourceTX Website - Main Script
 * Handles navigation, GitHub release API live version badges, and UI interactivity.
 */

(function () {
  // Mobile Nav Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.getElementById('nav-menu');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });
  }

  // Navbar Scroll Background Effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Dynamic GitHub Release Version Badges
  async function fetchLatestReleases() {
    try {
      // Android Release
      const androidRes = await fetch('https://api.github.com/repos/DrMeowy/-SourceTX-Companion-Android/releases/latest');
      if (androidRes.ok) {
        const data = await androidRes.json();
        const tag = data.tag_name || 'v0.2.8';
        const androidBadge = document.getElementById('android-version-badge');
        const androidDownloadBtn = document.getElementById('android-download-btn');
        if (androidBadge) androidBadge.textContent = tag;
        if (androidDownloadBtn && data.assets && data.assets.length > 0) {
          const apk = data.assets.find(a => a.name.endsWith('.apk'));
          if (apk) androidDownloadBtn.href = apk.browser_download_url;
        }
      }
    } catch (e) {
      console.log('GitHub API fetch notice (Android):', e);
    }

    try {
      // Windows Release
      const winRes = await fetch('https://api.github.com/repos/DrMeowy/SourceTX-Companion/releases/latest');
      if (winRes.ok) {
        const data = await winRes.json();
        const tag = data.tag_name || 'v0.1.5';
        const winBadge = document.getElementById('win-version-badge');
        const winDownloadBtn = document.getElementById('win-download-btn');
        if (winBadge) winBadge.textContent = tag;
        if (winDownloadBtn && data.assets && data.assets.length > 0) {
          const exe = data.assets.find(a => a.name.endsWith('.exe'));
          if (exe) winDownloadBtn.href = exe.browser_download_url;
        }
      }
    } catch (e) {
      console.log('GitHub API fetch notice (Windows):', e);
    }
  }

  // Interactive Card Mouse Glow Tracking
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // Pinout Quick Copy
  window.copyPin = function (pinName, pinNumber) {
    navigator.clipboard.writeText(`GPIO ${pinNumber}`);
    alert(`Copied ${pinName} (GPIO ${pinNumber}) to clipboard!`);
  };

  window.addEventListener('DOMContentLoaded', () => {
    fetchLatestReleases();
  });
})();
