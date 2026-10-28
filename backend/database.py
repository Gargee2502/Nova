import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pathlib import Path

from backend.config import settings

logger = logging.getLogger("nova.database")

class Database:
    def __init__(self):
        self.is_connected = False
        self.client = None
        self.db = None
        self.status_message = "Not connected"
        self._local_storage_file = settings.DATA_DIR / "local_db.json"
        self._local_data: Dict[str, List[Dict[str, Any]]] = {
            "meetings": [],
            "tasks": [],
            "reviews": [],
            "activities": [],
            "reminders": [],
            "settings": []
        }
        self._load_local_data()
        self._connect()

    def _load_local_data(self):
        if self._local_storage_file.exists():
            try:
                with open(self._local_storage_file, "r", encoding="utf-8") as f:
                    self._local_data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load local storage: {e}")

    def _save_local_data(self):
        try:
            with open(self._local_storage_file, "w", encoding="utf-8") as f:
                json.dump(self._local_data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to persist local storage: {e}")

    def _connect(self):
        if not settings.is_mongodb_configured:
            self.is_connected = False
            self.status_message = "MongoDB Atlas not configured (using local persistent storage)"
            logger.info(self.status_message)
            return

        try:
            import pymongo
            try:
                import certifi
                ca_file = certifi.where()
            except ImportError:
                ca_file = None

            # First attempt: Using certifi TLS CA bundle for Windows OpenSSL compatibility
            connected = False
            last_err = None

            try:
                kwargs = {
                    "serverSelectionTimeoutMS": 4000,
                    "connectTimeoutMS": 4000,
                }
                if ca_file:
                    kwargs["tlsCAFile"] = ca_file
                self.client = pymongo.MongoClient(settings.MONGODB_URI, **kwargs)
                self.client.admin.command('ping')
                connected = True
            except Exception as e1:
                last_err = e1
                # Second attempt: Retry with tlsAllowInvalidCertificates=True to bypass Windows TLS alert
                try:
                    kwargs = {
                        "serverSelectionTimeoutMS": 4000,
                        "connectTimeoutMS": 4000,
                        "tlsAllowInvalidCertificates": True,
                    }
                    if ca_file:
                        kwargs["tlsCAFile"] = ca_file
                    self.client = pymongo.MongoClient(settings.MONGODB_URI, **kwargs)
                    self.client.admin.command('ping')
                    connected = True
                except Exception as e2:
                    last_err = e2

            if not connected:
                raise last_err

            self.db = self.client[settings.DATABASE_NAME]
            self.is_connected = True
            self.status_message = f"Connected to MongoDB Atlas: {settings.DATABASE_NAME}"
            logger.info(self.status_message)
            self._ensure_indexes()
        except Exception as e:
            self.is_connected = False
            self.status_message = f"MongoDB connection failed: {str(e)[:120]} (using local storage fallback)"
            logger.warning(self.status_message)

    def _ensure_indexes(self):
        if not self.is_connected or self.db is None:
            return
        try:
            self.db.meetings.create_index("id", unique=True)
            self.db.tasks.create_index("id", unique=True)
            self.db.tasks.create_index("meeting_id")
            self.db.tasks.create_index("status")
            self.db.reviews.create_index("id", unique=True)
            self.db.reviews.create_index("status")
            self.db.activities.create_index("timestamp")
        except Exception as e:
            logger.warning(f"Could not create indexes: {e}")

    # ==================== GENERIC CRUD ====================

    def insert(self, collection_name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in document:
            document["id"] = str(uuid4())
        if "created_at" not in document:
            document["created_at"] = datetime.now(timezone.utc).isoformat()
        if "updated_at" not in document:
            document["updated_at"] = datetime.now(timezone.utc).isoformat()

        if self.is_connected and self.db is not None:
            doc_to_save = dict(document)
            self.db[collection_name].insert_one(doc_to_save)
            if "_id" in doc_to_save:
                del doc_to_save["_id"]
            return doc_to_save
        else:
            if collection_name not in self._local_data:
                self._local_data[collection_name] = []
            self._local_data[collection_name].append(document)
            self._save_local_data()
            return document

    def find_one(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            res = self.db[collection_name].find_one(query, {"_id": 0})
            return res
        else:
            records = self._local_data.get(collection_name, [])
            for item in records:
                match = True
                for k, v in query.items():
                    if item.get(k) != v:
                        match = False
                        break
                if match:
                    return dict(item)
            return None

    def find_many(
        self,
        collection_name: str,
        query: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = "created_at",
        ascending: bool = False,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        query = query or {}
        if self.is_connected and self.db is not None:
            direction = 1 if ascending else -1
            cursor = self.db[collection_name].find(query, {"_id": 0})
            if sort_by:
                cursor = cursor.sort(sort_by, direction)
            if limit:
                cursor = cursor.limit(limit)
            return list(cursor)
        else:
            records = self._local_data.get(collection_name, [])
            filtered = []
            for item in records:
                match = True
                for k, v in query.items():
                    if item.get(k) != v:
                        match = False
                        break
                if match:
                    filtered.append(dict(item))
            if sort_by:
                filtered.sort(key=lambda x: str(x.get(sort_by, "")), reverse=not ascending)
            if limit is not None:
                try:
                    lim_int = int(limit)
                    filtered = filtered[:lim_int]
                except (ValueError, TypeError):
                    pass
            return filtered

    def update(self, collection_name: str, query: Dict[str, Any], update_data: Dict[str, Any]) -> bool:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        if self.is_connected and self.db is not None:
            res = self.db[collection_name].update_one(query, {"$set": update_data})
            return res.modified_count > 0 or res.matched_count > 0
        else:
            records = self._local_data.get(collection_name, [])
            updated = False
            for idx, item in enumerate(records):
                match = True
                for k, v in query.items():
                    if item.get(k) != v:
                        match = False
                        break
                if match:
                    item.update(update_data)
                    self._local_data[collection_name][idx] = item
                    updated = True
                    break
            if updated:
                self._save_local_data()
            return updated

    def delete(self, collection_name: str, query: Dict[str, Any]) -> bool:
        if self.is_connected and self.db is not None:
            res = self.db[collection_name].delete_one(query)
            return res.deleted_count > 0
        else:
            records = self._local_data.get(collection_name, [])
            initial_len = len(records)
            self._local_data[collection_name] = [
                item for item in records
                if not all(item.get(k) == v for k, v in query.items())
            ]
            if len(self._local_data[collection_name]) < initial_len:
                self._save_local_data()
                return True
            return False

    def count(self, collection_name: str, query: Optional[Dict[str, Any]] = None) -> int:
        query = query or {}
        if self.is_connected and self.db is not None:
            return self.db[collection_name].count_documents(query)
        else:
            records = self._local_data.get(collection_name, [])
            if not query:
                return len(records)
            return sum(1 for item in records if all(item.get(k) == v for k, v in query.items()))

db = Database()
