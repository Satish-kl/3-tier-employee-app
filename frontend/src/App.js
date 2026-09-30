import "./App.css";
import axios from "axios";
import React, { useState, useEffect } from "react";

const URL = "/api";

function App() {
  const [data, setData] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [editId, setEditId] = useState(null);

  // READ
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(URL + "/user");
      setData(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  // CREATE
  const postData = async () => {
    if (!inputValue.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      await axios.post(URL + "/user", {
        name: inputValue,
      });

      setInputValue("");
      fetchData();
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  // Start UPDATE
  const startEdit = (user) => {
    setEditId(user.id);
    setInputValue(user.name);
  };

  // UPDATE
  const updateData = async () => {
    if (!inputValue.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      await axios.put(URL + "/user/" + editId, {
        name: inputValue,
      });

      setEditId(null);
      setInputValue("");
      fetchData();
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  // DELETE
  const deleteData = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(URL + "/user/" + id);
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  // Cancel UPDATE
  const cancelEdit = () => {
    setEditId(null);
    setInputValue("");
  };

  return (
    <div className="App">
      <h1>User Management System</h1>

      <div>
        <input
          type="text"
          name="input-parameter"
          placeholder="Enter user name"
          value={inputValue}
          onChange={handleChange}
        />

        {editId === null ? (
          <button onClick={postData}>Add User</button>
        ) : (
          <>
            <button onClick={updateData}>Update User</button>
            <button onClick={cancelEdit}>Cancel</button>
          </>
        )}
      </div>

      <br />

      <hr />

      <h2>Users List</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>
                <button onClick={() => startEdit(user)}>Edit</button>

                <button onClick={() => deleteData(user.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
