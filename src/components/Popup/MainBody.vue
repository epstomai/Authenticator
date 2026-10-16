<template>
  <div
    id="codes"
    v-bind:class="{ filter: shouldFilter && filter, search: true }"
  >
    <!-- Filter -->
    <div class="under-header" id="filter" v-on:click="clearFilter()">
      {{ i18n.show_all_entries }}
    </div>
    <!-- Search -->
    <div class="under-header" id="search">
      <input
        id="searchInput"
        v-model="searchText"
        v-bind:placeholder="searchPlaceholder"
        type="text"
        tabindex="-1"
        autocomplete="off"
        spellcheck="false"
      />
      <div id="searchHint" v-if="searchText === ''">
        <div></div>
        <div id="searchHintBorder">/</div>
        <div></div>
      </div>
    </div>
    <!-- Entries -->
    <div
      v-dragula
      drake="entryDrake"
      v-on:keydown.down="focusNextEntry()"
      v-on:keydown.right="focusNextEntry()"
      v-on:keydown.up="focusLastEntry()"
      v-on:keydown.left="focusLastEntry()"
    >
      <EntryComponent
        v-for="entry in entries"
        :key="entry.hash"
        v-bind:filtered="!entry.pinned && !isMatchedEntry(entry)"
        v-bind:notSearched="!isSearchedEntry(entry)"
        v-bind:entry="entry"
        v-bind:tabindex="getTabindex(entry)"
        v-bind:isMatched="isMatchedEntry(entry)"
        v-bind:isLearned="isLearnedEntry(entry)"
      />
      <div class="no-entry" v-if="entries.length === 0 && initComplete">
        <IconKey />
        <p>
          {{ i18n.no_entires }}
          <a href="#" v-on:click="openLink('https://otp.ee/quickstart')">{{
            i18n.learn_more
          }}</a>
        </p>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { mapState, mapGetters } from "vuex";
import { OTPEntry } from "../../models/otp";
import { EntryStorage } from "../../models/storage";
import { getCurrentTab } from "../../utils";
import { getDefaultTabSearchStore } from "../../models/search-session";

import EntryComponent from "./EntryComponent.vue";

import IconKey from "../../../svg/key-solid.svg";

const computed: {
  filter: () => boolean;
  showSearch: () => boolean;
  shouldFilter: () => boolean;
  entries: () => OTPEntry[];
  matchedEntries: () => string[];
  learnedEntryHashes: () => string[];
  currentHostname: () => string;
} = {
  ...mapState("accounts", ["filter", "showSearch", "initComplete"]),
  ...mapGetters("accounts", [
    "shouldFilter",
    "entries",
    "matchedEntries",
    "learnedEntryHashes",
    "currentHostname",
  ]),
};

export default Vue.extend({
  data: function () {
    return {
      searchText: "",
      tabId: null as number | null,
    };
  },
  computed: {
    ...computed,
    searchPlaceholder(): string {
      const hostname = this.currentHostname;
      if (hostname) {
        return `${this.i18n.search} · ${hostname}`;
      }
      return this.i18n.search;
    },
  },
  watch: {
    searchText(value: string) {
      if (this.tabId !== null) {
        getDefaultTabSearchStore().save(this.tabId, value);
      }
      if (value) {
        this.$store.commit("accounts/showSearch");
      }
    },
  },
  methods: {
    openLink(url: string) {
      window.open(url, "_blank");
      return;
    },
    isMatchedEntry(entry: OTPEntry) {
      for (const hash of this.matchedEntries || []) {
        if (entry.hash === hash) {
          return true;
        }
      }
      return false;
    },
    isLearnedEntry(entry: OTPEntry) {
      return (this.learnedEntryHashes || []).indexOf(entry.hash) !== -1;
    },
    isSearchedEntry(entry: OTPEntry) {
      if (this.searchText === "") {
        return true;
      }
      if (
        entry.issuer.toLowerCase().includes(this.searchText.toLowerCase()) ||
        entry.account.toLowerCase().includes(this.searchText.toLowerCase())
      ) {
        return true;
      } else {
        return false;
      }
    },
    clearFilter() {
      this.$store.dispatch("accounts/clearFilter");
    },
    isEntryVisible(entry: OTPEntry) {
      return (
        this.isSearchedEntry(entry) &&
        (entry.pinned ||
          !this.shouldFilter ||
          !this.filter ||
          this.isMatchedEntry(entry))
      );
    },
    getTabindex(entry: OTPEntry) {
      const firstEntry = this.entries.find((item) => this.isEntryVisible(item));

      return entry === firstEntry ? 0 : -1;
    },
    findNextEntryIndex(reverse: boolean) {
      if (document.activeElement?.getAttribute("data-x-role") !== "entry") {
        return -1;
      }

      const activeIndex = Array.prototype.indexOf.call(
        document.querySelectorAll(".entry"),
        document.activeElement
      );
      if (activeIndex === -1) {
        return -1;
      }

      // reverse modify origin array, and use slice() to make a clone first
      const _entries = reverse ? this.entries.slice().reverse() : this.entries;

      let nextIndex = _entries.findIndex(
        (entry, index) =>
          index >
            (reverse ? this.entries.length - 1 - activeIndex : activeIndex) &&
          this.isEntryVisible(entry)
      );

      if (nextIndex === -1) {
        nextIndex = _entries.findIndex((entry) => this.isEntryVisible(entry));
      }

      return nextIndex;
    },
    focusNextEntry() {
      const nextIndex = this.findNextEntryIndex(false);
      document
        .querySelector<HTMLLinkElement>(`.entry:nth-child(${nextIndex + 1})`)
        ?.focus();
    },
    focusLastEntry() {
      const lastIndex = this.entries.length - 1 - this.findNextEntryIndex(true);
      document
        .querySelector<HTMLLinkElement>(`.entry:nth-child(${lastIndex + 1})`)
        ?.focus();
    },
  },
  async created() {
    // Don't drag if !isEditing
    this.$dragula.$service.options("entryDrake", {
      invalid: () => {
        if (!this.$store.state.style.style.isEditing) {
          return true;
        } else {
          return false;
        }
      },
    });

    // Update entry index if dragged
    this.$dragula.$service.eventBus.$on(
      "dropModel",
      async ({
        dragIndex,
        dropIndex,
      }: {
        dragIndex: number;
        dropIndex: number;
      }) => {
        this.$store.commit("accounts/moveCode", {
          from: dragIndex,
          to: dropIndex,
        });
        await EntryStorage.set(this.$store.state.accounts.entries);
      }
    );

    const tab = await getCurrentTab();
    if (tab?.id !== undefined) {
      this.tabId = tab.id;
      const saved = await getDefaultTabSearchStore().load(tab.id);
      if (saved) {
        this.searchText = saved;
        this.$store.commit("accounts/showSearch");
      }
    }
  },
  components: {
    EntryComponent,
    IconKey,
  },
});
</script>
