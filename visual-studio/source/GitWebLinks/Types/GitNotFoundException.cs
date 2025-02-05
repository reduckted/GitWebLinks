#nullable enable

using System;
using System.Runtime.Serialization;

namespace GitWebLinks;

[Serializable]
public class GitNotFoundException : Exception {

    public GitNotFoundException(string message) : base(message) { }


    protected GitNotFoundException(SerializationInfo info, StreamingContext context) : base(info, context) { }

}
